const React = require('react');
const { afterEach, beforeEach, describe, it, jest, expect } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../../bible/test-utils/hookTestHelpers');

jest.mock('../../../../application/services/deleteUpcomingCarry', () => ({
  deleteUpcomingCarry: jest.fn(),
}));

const { deleteUpcomingCarry } = require('../../../../application/services/deleteUpcomingCarry');
const { useCarryDetailViewModel } = require('../useCarryDetailViewModel');

const category = { id: 'work', name: 'Work' };
const carry = (id = 'carry-1', scheduledAt = new Date('2099-01-01T00:00:00.000Z')) => ({
  id,
  categoryId: category.id,
  situation: 'Before a hard conversation',
  scheduledAt,
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.19' },
  ifThenIntention: 'If I feel tense, then I will listen first.',
  createdAt: new Date('2026-10-02T01:00:00.000Z'),
});
const passage = {
  reference: 'James 1:19',
  verses: [{ key: 'JAS.1.19', bookId: 'JAS', chapter: 1, verse: 19, text: 'Be quick to hear.' }],
};
const ok = (value) => ({ ok: true, value });

let renderer;

beforeEach(() => deleteUpcomingCarry.mockReset());
afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('Carry detail delete view model', () => {
  it('locks duplicate confirmations and keeps a failed deletion on the detail screen', async () => {
    let resolveDelete;
    const deletion = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    deleteUpcomingCarry.mockReturnValue(deletion);
    const repository = {
      findById: jest.fn().mockResolvedValue(ok(carry())),
      getCategories: jest.fn().mockResolvedValue(ok([category])),
    };
    const bibleRepository = { getPassage: jest.fn().mockResolvedValue(ok(passage)) };
    let model;
    function Probe() {
      model = useCarryDetailViewModel(repository, bibleRepository, 'carry-1', true);
      return null;
    }

    renderer = await mountProbe(Probe);
    expect(model.state.status).toBe('ready');

    let firstDelete;
    await React.act(async () => {
      firstDelete = model.deleteCarry();
    });
    expect(model.isDeleting).toBe(true);
    await React.act(async () => model.deleteCarry());
    expect(deleteUpcomingCarry).toHaveBeenCalledTimes(1);

    await React.act(async () => {
      resolveDelete({ ok: false, code: 'unavailable' });
      await firstDelete;
    });
    expect(model.isDeleting).toBe(false);
    expect(model.deleteError).toBe('This Carry could not be deleted. Please try again.');
    expect(model.state.status).toBe('ready');
  });

  it('refreshes a Carry that is no longer upcoming while retaining the message', async () => {
    const noLongerUpcoming = carry('carry-1', new Date('2020-01-01T00:00:00.000Z'));
    const repository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(ok(carry()))
        .mockResolvedValueOnce(ok(noLongerUpcoming)),
      getCategories: jest.fn().mockResolvedValue(ok([category])),
    };
    const bibleRepository = { getPassage: jest.fn().mockResolvedValue(ok(passage)) };
    deleteUpcomingCarry.mockResolvedValue({ ok: false, code: 'not_upcoming' });
    let model;
    function Probe() {
      model = useCarryDetailViewModel(repository, bibleRepository, 'carry-1', true);
      return null;
    }

    renderer = await mountProbe(Probe);
    await React.act(async () => model.deleteCarry());

    expect(repository.findById).toHaveBeenCalledTimes(2);
    expect(model.state.status).toBe('ready');
    expect(model.state.data.carry).toBe(noLongerUpcoming);
    expect(model.deleteError).toBe('This Carry is no longer upcoming, so it was not deleted.');
    expect(model.deletedCarryId).toBeNull();
  });

  it.each(['blur', 'carry ID change', 'repository change', 'unmount'])(
    'ignores a stored confirmation and delete result after %s',
    async (change) => {
      let resolveDelete;
      const deletion = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      deleteUpcomingCarry.mockReturnValue(deletion);
      const firstRepository = {
        findById: jest.fn().mockImplementation((id) => Promise.resolve(ok(carry(id)))),
        getCategories: jest.fn().mockResolvedValue(ok([category])),
      };
      const secondRepository = {
        findById: jest.fn().mockImplementation((id) => Promise.resolve(ok(carry(id)))),
        getCategories: jest.fn().mockResolvedValue(ok([category])),
      };
      let repository = firstRepository;
      const bibleRepository = { getPassage: jest.fn().mockResolvedValue(ok(passage)) };
      let focused = true;
      let carryId = 'carry-1';
      let model;
      function Probe() {
        model = useCarryDetailViewModel(repository, bibleRepository, carryId, focused);
        return null;
      }

      renderer = await mountProbe(Probe);
      const storedConfirmation = model.deleteCarry;
      let pendingDelete;
      await React.act(async () => {
        pendingDelete = storedConfirmation();
      });

      if (change === 'blur') {
        focused = false;
        await React.act(async () => renderer.update(React.createElement(Probe)));
      } else if (change === 'carry ID change') {
        carryId = 'carry-2';
        await React.act(async () => renderer.update(React.createElement(Probe)));
      } else if (change === 'repository change') {
        repository = secondRepository;
        await React.act(async () => renderer.update(React.createElement(Probe)));
      } else {
        await unmountProbe(renderer);
        renderer = undefined;
      }

      await React.act(async () => storedConfirmation());
      expect(deleteUpcomingCarry).toHaveBeenCalledTimes(1);

      await React.act(async () => {
        resolveDelete({ ok: true });
        await pendingDelete;
      });

      if (change !== 'unmount') {
        expect(model.deletedCarryId).toBeNull();
        expect(model.isDeleting).toBe(false);
      }
    },
  );
});
