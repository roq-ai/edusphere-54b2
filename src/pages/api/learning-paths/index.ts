import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'server/db';
import { authorizationValidationMiddleware, errorHandlerMiddleware } from 'server/middlewares';
import { learningPathValidationSchema } from 'validationSchema/learning-paths';
import { convertQueryToPrismaUtil } from 'server/utils';
import { getServerSession } from '@roq/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roqUserId, user } = await getServerSession(req);
  switch (req.method) {
    case 'GET':
      return getLearningPaths();
    case 'POST':
      return createLearningPath();
    default:
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  async function getLearningPaths() {
    const data = await prisma.learning_path
      .withAuthorization({
        roqUserId,
        tenantId: user.tenantId,
        roles: user.roles,
      })
      .findMany(convertQueryToPrismaUtil(req.query, 'learning_path'));
    return res.status(200).json(data);
  }

  async function createLearningPath() {
    await learningPathValidationSchema.validate(req.body);
    const body = { ...req.body };
    if (body?.student_learning_path?.length > 0) {
      const create_student_learning_path = body.student_learning_path;
      body.student_learning_path = {
        create: create_student_learning_path,
      };
    } else {
      delete body.student_learning_path;
    }
    const data = await prisma.learning_path.create({
      data: body,
    });
    return res.status(200).json(data);
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  return errorHandlerMiddleware(authorizationValidationMiddleware(handler))(req, res);
}
