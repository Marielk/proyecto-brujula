import { expect, test } from "@playwright/test";

test("journey decision can be created, recovered, reviewed and reused as learning", async ({ page }) => {
  await page.goto("/viaje/historial");
  await page.evaluate(() => {
    window.localStorage.clear();
    const state = {
      year: 2026,
      age: 40,
      compass: 70,
      dashboard: { "Estabilidad financiera": 70, "Libertad para crear": 60, "Energía diaria": 65 },
      monthlyIncome: 0,
      monthlyExpenses: 0,
      debtTotal: 0,
      savings: 0,
      money: { monthlyIncome: "0", monthlyExpenses: "0", debtTotal: "0", savings: "0" }
    };
    const result = {
      scenario: { name: "Validar taller creativo", description: "Simulacion", startYear: 2026, endYear: 2027 },
      states: [state],
      final: state,
      summary: { strongest: "claridad", weakest: "tiempo", compass: 70 },
      notes: [],
      report: "Carta de Sue",
      lifeReport: {
        summary: {
          title: "Validar taller creativo",
          diagnosis: "Hay una ruta prudente.",
          status: "estable",
          description: "Reporte minimo",
          strongest: "claridad",
          mainCare: "tiempo"
        },
        lifeSummary: {
          diagnosticoCamino: "",
          calidadVida: 70,
          libertadFinanciera: 70,
          libertadCreativa: 60,
          saludIntegral: 70,
          energiaVital: 65,
          serenidad: 65,
          resiliencia: 70,
          esperanza: 70,
          riesgoAgotamiento: "medio",
          probabilidadArrepentimiento: "baja",
          coherenciaEstrellaNorte: "alta",
          fortalezas: [],
          cuidados: [],
          eventosCamino: [],
          valores: [],
          suenos: [],
          escenario: "Validar taller creativo",
          brujulaGeneral: 70
        },
        indices: [],
        gains: [],
        sacrifices: [],
        timeline: [],
        garden: [],
        rituals: []
      },
      candidatePaths: [
        {
          id: "path_recommended",
          name: "Piloto pequeño",
          strategy: "piloto",
          description: "Probar un taller sin renunciar al empleo.",
          assumptions: ["Hay interes inicial."],
          tradeoffs: ["Requiere energia semanal."],
          steps: ["Escribir hoy una propuesta de una pagina", "Conversar manana con cinco personas"],
          timeEstimate: "30 dias",
          financialRisk: "bajo",
          energyDemand: "media",
          reversibility: "alta",
          creativeUpside: "medio",
          preparation: 70,
          compass: 70,
          selectionScore: 80,
          riskLevel: "bajo",
          firstStep: "Escribir hoy una hipotesis observable."
        }
      ],
      lifeProfile: {},
      warnings: [],
      llm: { scenario: false, report: false, model: "local" }
    };
    const stored = {
      latest: "sim_e2e",
      items: {
        sim_e2e: {
          status: "result",
          goal: "Validar taller creativo",
          simulationId: "sim_e2e",
          result,
          completedAt: new Date().toISOString()
        }
      }
    };
    window.localStorage.setItem("brujula.journeyResults.v0.15", JSON.stringify(stored));
  });

  await page.goto("/viaje/decision/nueva/sim_e2e");
  await expect(page.getByRole("heading", { name: /Probemos una hipótesis pequeña/i })).toBeVisible();
  await page.getByLabel("Pregunta principal").fill("¿Puedo validar un taller creativo sin dejar mi empleo?");
  await page.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByText("Plan guardado. Puedes volver para revisarlo.")).toBeVisible();

  await page.goto("/viaje/historial");
  await expect(page.getByText("Validar taller creativo")).toBeVisible();
  await page.getByRole("link", { name: "Registrar revisión" }).first().click();
  await page.getByLabel("Qué cambió en tu comprensión").fill("Aprendí que hay interés, pero necesito bajar el alcance.");
  await page.getByLabel("Qué funcionó").fill("Las conversaciones dieron señales útiles.");
  await page.getByLabel("Qué fue más difícil").fill("Sostener el tiempo semanal.");
  await page.getByLabel("Decisión siguiente").selectOption("adjust");
  await page.getByRole("button", { name: "Guardar revisión" }).click();
  await expect(page.getByText("Revisión guardada.")).toBeVisible();

  await page.goto("/viaje/historial");
  await expect(page.getByText("Aprendí que hay interés, pero necesito bajar el alcance.")).toBeVisible();
  await page.getByRole("button", { name: "Usar aprendizaje en un nuevo viaje" }).click();
  await expect(page).toHaveURL(/\/viaje$/);
});
