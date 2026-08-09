import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { dramasRouter } from "./dramas";
import { episodesRouter } from "./episodes";
import { userRouter } from "./user";

const router: IRouter = Router();

router.use(healthRouter);

// CineDrama API v1
router.use("/v1/dramas", dramasRouter);
router.use("/v1/dramas/:id/episodes", episodesRouter);
router.use("/v1/user", userRouter);

export default router;
