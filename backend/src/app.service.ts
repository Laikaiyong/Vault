import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      name: 'Vault Staking Platform API',
    };
  }
}