import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BinsController } from './bins.controller.js';
import { BinsService } from './bins.service.js';

describe('BinsController', () => {
  const getDetail = vi.fn();
  const getScoreHistory = vi.fn();
  let controller: BinsController;

  beforeEach(async () => {
    getDetail.mockReset().mockResolvedValue({});
    getScoreHistory.mockReset().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      controllers: [BinsController],
      providers: [{ provide: BinsService, useValue: { getDetail, getScoreHistory } }],
    }).compile();
    controller = moduleRef.get(BinsController);
  });

  it('normalizes typed or scanned codes', async () => {
    await controller.detail(' a-01-03 ');
    expect(getDetail).toHaveBeenCalledWith('A-01-03');
  });

  it('passes a valid history limit through', async () => {
    await controller.scores('a-01-03', 5);
    expect(getScoreHistory).toHaveBeenCalledWith('A-01-03', 5);
  });

  it.each([0, 101])('rejects limit %i', (limit) => {
    expect(() => controller.scores('A-01-03', limit)).toThrow(BadRequestException);
    expect(getScoreHistory).not.toHaveBeenCalled();
  });
});
