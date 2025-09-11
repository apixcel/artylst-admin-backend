import { Request, Response, Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import config from "../config";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Artylst API", version: "1.0.0" },
    servers: [{ url: "/api/v1" }],
  },
  apis: ["./src/routes/*.ts", "./src/app/routes/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(router: Router) {
  // @ts-expect-error: swaggerUi is a valid middleware
  router.use("", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Docs in JSON format
  router.get("/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`Docs available at ${config.SERVER_BASE_URL}/api/v1/docs`);
}

export default swaggerDocs;
