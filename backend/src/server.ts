import dotenv from "dotenv";
import { app } from "./app";

dotenv.config();
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`MiniLedger API running on http://localhost:${port}`));
