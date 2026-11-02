// Tests RLS de l'espace étudiant : chaque test s'exécute dans une transaction annulée (aucune donnée modifiée),
// sous le rôle « authenticated » avec l'identité d'un compte de démonstration.
// Usage : npm.cmd run test:rls   (après npm.cmd run db:seed-student)
import pg from "pg";

const U = {
  eds: "d0000000-0000-4000-8000-000000000001",
  edm: "d0000000-0000-4000-8000-000000000002",
  dia: "d0000000-0000-4000-8000-000000000003",
  sup: "d0000000-0000-4000-8000-000000000004",
  cand: "d0000000-0000-4000-8000-000000000006",
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let failed = 0;
async function as(user, fn) {
  await client.query("begin");
  try {
    if (user) {
      await client.query("select set_config('request.jwt.claims', $1, true), set_config('role', 'authenticated', true)", [
        JSON.stringify({ sub: user, role: "authenticated" }),
      ]);
    } else {
      await client.query("select set_config('role', 'anon', true)");
    }
    return await fn();
  } finally {
    await client.query("rollback");
  }
}
const count = async (sql, params = []) => Number((await client.query(sql, params)).rows[0].n);
function check(name, ok) {
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✘"} ${name}`);
}
async function rejects(name, user, sql, params = []) {
  let error = null;
  await as(user, async () => {
    await client.query("savepoint s");
    try {
      await client.query(sql, params);
    } catch (e) {
      error = e;
    }
  });
  check(name, error !== null);
}

const others = (table, col = "user_id") => `select count(*) n from public.${table} where ${col} <> $1`;
for (const table of ["lesson_progress", "grades", "validations", "payment_schedules", "notifications", "quiz_attempts", "receipts", "student_notes"]) {
  const n = await as(U.eds, () => count(others(table), [U.eds]));
  check(`EDS ne lit aucune ligne d'un autre étudiant dans ${table}`, n === 0);
}
check(
  "EDS ne lit aucune conversation d'un autre étudiant",
  (await as(U.eds, () => count(others("message_threads", "student_id"), [U.eds]))) === 0,
);
check(
  "EDS ne voit que les modules de sa formation",
  (await as(U.eds, () =>
    count("select count(*) n from public.modules m join public.formations f on f.id = m.formation_id where f.slug <> 'eds'"),
  )) === 0,
);
check("EDS voit ses 5 modules", (await as(U.eds, () => count("select count(*) n from public.modules"))) === 5);
check("EDS ne voit ni stage ni mémoire de diacre", (await as(U.eds, () => count("select (select count(*) from public.theses) + (select count(*) from public.internships) n"))) === 0);
check("EDM ne voit pas les exercices de mentorat d'un autre étudiant", (await as(U.edm, () => count(others("mentoring_exercises"), [U.edm]))) === 0);
check("Diacre voit son mémoire", (await as(U.dia, () => count("select count(*) n from public.theses"))) === 1);
check("Diacre ne voit pas les notes EDS", (await as(U.dia, () => count("select count(*) n from public.grades where user_id = $1", [U.eds]))) === 0);
check("Superviseur voit le mémoire supervisé", (await as(U.sup, () => count("select count(*) n from public.theses"))) === 1);
check("Candidat en étude : aucun contenu pédagogique", (await as(U.cand, () => count("select count(*) n from public.modules"))) === 0);
check("Visiteur anonyme : aucun contenu pédagogique", (await as(null, () => count("select count(*) n from public.modules"))) === 0);

await rejects("Corrigés des quiz illisibles par un étudiant", U.eds, "select * from public.question_keys");
await rejects("Un étudiant ne peut pas s'attribuer une note", U.eds,
  "insert into public.grades (user_id, label, score, max_score) values ($1, 'triche', 20, 20)", [U.eds]);
await rejects("Un étudiant ne peut pas valider sa propre décision", U.eds,
  "update public.validations set decision = 'granted' where user_id = $1", [U.eds]);
await rejects("Un étudiant ne peut pas écrire la progression d'un autre", U.eds,
  "insert into public.lesson_progress (user_id, lesson_id) select $1, id from public.lessons limit 1", [U.edm]);
await rejects("Un étudiant ne peut pas modifier le texte d'un message", U.eds, "update public.messages set body = 'x'");
await rejects("Un étudiant ne peut pas ouvrir un commentaire de superviseur", U.dia,
  `insert into public.thesis_comments (thesis_id, version_id, author_id, author_name, author_role, body)
   select t.id, v.id, $1, 'x', 'supervisor', 'x' from public.theses t join public.thesis_versions v on v.thesis_id = t.id limit 1`, [U.dia]);
await rejects("Un étudiant ne peut pas valider ses heures de stage", U.dia,
  "insert into public.internship_hours (internship_id, worked_on, hours, activity, validated) select id, current_date, 2, 'test rls', true from public.internships", []);

const reply = await as(U.dia, async () => {
  await client.query(
    `insert into public.thesis_comments (thesis_id, version_id, parent_id, author_id, author_name, author_role, body)
     select c.thesis_id, c.version_id, c.id, $1, 'Esther', 'student', 'Réponse' from public.thesis_comments c where c.parent_id is null limit 1`,
    [U.dia],
  );
  return true;
}).catch(() => false);
check("Le diacre peut répondre à un commentaire de son superviseur", reply);

await client.end();
console.log(failed ? `\n${failed} test(s) en échec` : "\nTous les tests RLS sont passés.");
process.exit(failed ? 1 : 0);
