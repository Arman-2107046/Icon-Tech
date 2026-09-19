// cart module — zod schemas (server-side validation). Browser-safe exports live in ./types.

import { z } from "zod";
import { MAX_LINE_QUANTITY } from "./types";

export const quantitySchema = z.coerce.number().int("Quantity must be a whole number").min(0).max(MAX_LINE_QUANTITY, `At most ${MAX_LINE_QUANTITY} per item`);
