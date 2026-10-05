import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditsController } from './audits.controller.js';
import { AuditsService } from './audits.service.js';

describe('AuditsController', () => {
  const getCountSheet = vi.fn();
  const submitCount = vi.fn();
  let controller: AuditsController;

  beforeEach(async () => {
    getCountSheet.mockReset().mockResolvedValue({});
    submitCount.mockReset().mockResolvedValue({});
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditsController],
      providers: [
        { provide: AuditsService, useValue: { getCountSheet, submitCount } },
      ],
    }).compile();
    controller = moduleRef.get(AuditsController);
  });

  it('normalizes the bin code of the count sheet', async () => {
    await controller.countSheet(' a-01-03 ');
    expect(getCountSheet).toHaveBeenCalledWith('A-01-03');
  });

  it('passes a valid count through', async () => {
    const body = {
      finalOutcome: 'PASS',
      lines: [{ palletItemId: 1, expectedQty: 3, countedQty: 3 }],
    };
    await controller.submit('b-02-01', body);
    expect(submitCount).toHaveBeenCalledWith('B-02-01', body);
  });

  it('rejects an invalid count with 400', () => {
    expect(() =>
      controller.submit('A-01-01', { finalOutcome: 'MAYBE', lines: [] }),
    ).toThrow(BadRequestException);
    expect(submitCount).not.toHaveBeenCalled();
  });
});
