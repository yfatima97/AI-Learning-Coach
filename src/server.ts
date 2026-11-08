import { config } from "./config/env.js";
import { app } from "./app.js";

app.listen(config.port, () => {
  console.log(`AI Learning Coach API running on http://localhost:${config.port} (model: ${config.model})`);
});
