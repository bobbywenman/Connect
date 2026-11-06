import { deleteNetworkMessage, deleteNetworkTitle } from './deleteMessage';

describe('delete network confirmation text', () => {
  it('titles with the network name', () => {
    expect(deleteNetworkTitle('Wenman Family')).toBe('Delete ‘Wenman Family’?');
  });

  it('pluralizes the people who would be deleted', () => {
    expect(deleteNetworkMessage(8)).toBe(
      "This removes the network and its 8 people who aren't in any other network. People in other networks are kept.",
    );
    expect(deleteNetworkMessage(1)).toBe(
      "This removes the network and its 1 person who isn't in any other network. People in other networks are kept.",
    );
  });

  it('says no people are deleted when there are none', () => {
    expect(deleteNetworkMessage(0)).toContain('no people are deleted');
  });
});
