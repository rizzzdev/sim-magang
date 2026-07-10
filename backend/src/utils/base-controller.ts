import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '@/utils/response.js';
import path from 'path';

export type ControllerMessages = {
  getAll: string;
  getById: string;
  create: string;
  update: string;
  delete: string;
  bulkDelete: string;
  changePassword: string;
  bulkCreate: string;
};

export type BulkCreateService = {
  bulkCreateJson: (data: any[], actorId?: string) => Promise<number>;
};

export type CrudService = {
  getAll: (page: number, limit: number, search?: string) => Promise<{ data: any[]; total: number }>;
  getById: (id: string) => Promise<any>;
  create: (data: any, actorId?: string) => Promise<any>;
  update: (id: string, data: any, actorId?: string) => Promise<any>;
  delete: (id: string, actorId?: string) => Promise<any>;
  bulkDelete: (ids: string[], actorId?: string) => Promise<any>;
  changePassword: (id: string, data: { newPassword: string }) => Promise<any>;
};

export class BaseController {
  constructor(
    protected service: any,
    protected messages: ControllerMessages,
    protected templateFilename?: string,
  ) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const { data, total } = await this.service.getAll(page, limit, search);
      sendResponse(res, 200, this.messages.getAll, data, {
        currentPage: page,
        totalPage: Math.ceil(total / limit),
        totalData: total,
        dataPerPage: limit,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(req.params.id as string);
      sendResponse(res, 200, this.messages.getById, data);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id;
      const data = await this.service.create(req.body, actorId);
      sendResponse(res, 201, this.messages.create, data);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id;
      const data = await this.service.update(req.params.id as string, req.body, actorId);
      sendResponse(res, 200, this.messages.update, data);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id;
      await this.service.delete(req.params.id as string, actorId);
      sendResponse(res, 200, this.messages.delete);
    } catch (error) {
      next(error);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id;
      const result = await this.service.bulkDelete(req.body.ids, actorId);
      sendResponse(res, 200, `Berhasil menghapus ${result.count} data`);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.changePassword(req.params.id as string, req.body);
      sendResponse(res, 200, this.messages.changePassword);
    } catch (error) {
      next(error);
    }
  };

  downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filename = this.templateFilename || 'template.xlsx';
      const filePath = path.join(process.cwd(), 'public', filename);
      res.download(filePath, filename);
    } catch (error) {
      next(error);
    }
  };

  bulkCreateJson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id;
      const count = await this.service.bulkCreateJson(req.body, actorId);
      sendResponse(res, 201, `Berhasil mengimpor ${count} data`);
    } catch (error) {
      next(error);
    }
  };
}
