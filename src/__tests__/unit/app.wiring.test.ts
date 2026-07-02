import { describe, it, expect } from "vitest";

/**
 * Smoke / wiring tests for the composition-root modules (app, router, prisma
 * singleton). These have no branching logic of their own, so they are covered
 * here by simply asserting they are assembled and exported correctly. The real
 * request behaviour is exercised end-to-end in the e2e suite.
 */
describe("App wiring", () => {
	it("should export a configured Express application", async () => {
		const { default: app } = await import("../../app.js");

		expect(app).toBeDefined();
		// Express app is a callable request handler with routing helpers
		expect(typeof app).toBe("function");
		expect(typeof app.use).toBe("function");
		expect(typeof app.listen).toBe("function");
	});

	it("should export the task router", async () => {
		const { default: router } = await import("../../routes/task.routes.js");

		expect(router).toBeDefined();
		expect(typeof router).toBe("function");
		// Express routers expose a `stack` of registered layers
		expect(Array.isArray((router as unknown as { stack: unknown[] }).stack)).toBe(
			true
		);
		expect(
			(router as unknown as { stack: unknown[] }).stack.length
		).toBeGreaterThan(0);
	});

	it("should export the prisma client singleton with a task delegate", async () => {
		const { default: prisma } = await import("../../lib/prisma.js");

		expect(prisma).toBeDefined();
		expect(prisma.task).toBeDefined();
		expect(typeof prisma.task.findMany).toBe("function");
	});
});
