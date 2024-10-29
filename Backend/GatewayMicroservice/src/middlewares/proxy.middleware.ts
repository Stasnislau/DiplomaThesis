import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AUTH_MICROSERVICE_URL } from 'src/consts';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(private httpService: HttpService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { method, url, headers, body } = req;
    const targetUrl = `${AUTH_MICROSERVICE_URL}${url}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: targetUrl,
          headers,
          data: body,
          validateStatus: () => true, // This allows to handle any status code
        })
      );

      // Пробрасываем заголовки
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Пробрасываем статус и тело ответа
      res.status(response.status).send(response.data);
    } catch (error) {
      console.error(`Error in proxy middleware:`, error);
      res.status(500).json({ 
        success: false, 
        payload: { 
          message: 'Internal Server Error',
          timestamp: new Date().toISOString()
        } 
      });
    }
  }
}
