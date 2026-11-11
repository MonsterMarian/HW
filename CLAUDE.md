# Pravidla repozitáře HW

- **Po každém dokončeném kroku práce commitni a pushni** (`git add` → `git commit` → `git push` na `origin`, větev `main`).
  Commit jen se zelenými testy (`cd silicon-logic-studio && npm test`), lintem (`npx oxlint`) a buildem (`npm run build`).
- Zprávy commitů česky nebo anglicky, krátce, ve tvaru `feat(oblast): co` / `fix(oblast): co` / `docs: co`.
- Aktuální plán práce je v `PLAN_POKRACOVANI.md`, stav a historie v `AgentMEMORY.md`, odhady mého PC v `MujPC_odhady.md`.
- Do plánů nepatří administrativní úkoly (licence, atribuce); jen práce, ze které vzniká kód nebo funkce.
- Aplikaci uživateli neotvírat (žádné `npm run desktop` ani viditelný prohlížeč); vizuální kontrola jen přes
  `tools/shot.cjs` se skrytým oknem (viz `AgentMEMORY.md`).
