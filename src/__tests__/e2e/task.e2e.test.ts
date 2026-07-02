import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

async function seedTask(
	overrides: { title?: string; description?: string; completed?: boolean } = {}
) {
	return testPrisma.task.create({
		data: {
			title: overrides.title ?? "Seed Task",
			description: overrides.description ?? "Seed description",
			completed: overrides.completed ?? false,
		},
	});
}

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should create a task without a description", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "No description" });

			expect(res.status).toBe(201);
			expect(res.body.title).toBe("No description");
			expect(res.body.description).toBeNull();
		});

		it("should trim the title before persisting", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "   Padded   " });

			expect(res.status).toBe(201);
			expect(res.body.title).toBe("Padded");
		});

		it("should return 400 when the title is missing", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "no title" });

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
		});

		it("should return 400 when the title is empty", async () => {
			const res = await request(app).post("/api/tasks").send({ title: "   " });

			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty array when there are no tasks", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all tasks ordered by createdAt desc", async () => {
			const first = await seedTask({ title: "First" });
			// Ensure a distinct, later createdAt for the second task
			await new Promise((r) => setTimeout(r, 5));
			const second = await seedTask({ title: "Second" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body[0].id).toBe(second.id);
			expect(res.body[1].id).toBe(first.id);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a task by id", async () => {
			const task = await seedTask({ title: "Find me" });

			const res = await request(app).get(`/api/tasks/${task.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(task.id);
			expect(res.body.title).toBe("Find me");
		});

		it("should return 400 for a non-numeric id", async () => {
			const res = await request(app).get("/api/tasks/abc");

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("error");
		});

		it("should return 404 when the task does not exist", async () => {
			const res = await request(app).get("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update an existing task", async () => {
			const task = await seedTask({ title: "Before" });

			const res = await request(app)
				.put(`/api/tasks/${task.id}`)
				.send({ title: "After", completed: true });

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("After");
			expect(res.body.completed).toBe(true);
		});

		it("should return 400 for a non-numeric id", async () => {
			const res = await request(app)
				.put("/api/tasks/abc")
				.send({ title: "x" });

			expect(res.status).toBe(400);
		});

		it("should return 404 when updating a missing task", async () => {
			const res = await request(app)
				.put("/api/tasks/999999")
				.send({ title: "ghost" });

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete an existing task", async () => {
			const task = await seedTask({ title: "Delete me" });

			const res = await request(app).delete(`/api/tasks/${task.id}`);

			expect(res.status).toBe(204);

			const check = await testPrisma.task.findUnique({
				where: { id: task.id },
			});
			expect(check).toBeNull();
		});

		it("should return 400 for a non-numeric id", async () => {
			const res = await request(app).delete("/api/tasks/abc");

			expect(res.status).toBe(400);
		});

		it("should return 404 when deleting a missing task", async () => {
			const res = await request(app).delete("/api/tasks/999999");

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("error");
		});
	});
});
