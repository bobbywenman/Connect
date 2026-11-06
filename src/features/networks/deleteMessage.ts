/** Title for the delete-network confirmation. */
export function deleteNetworkTitle(name: string): string {
  return `Delete ‘${name}’?`;
}

/**
 * Body of the delete-network confirmation. States exactly what is removed:
 * the network and the people who belong to no other network (D-1).
 */
export function deleteNetworkMessage(onlyPeopleCount: number): string {
  if (onlyPeopleCount <= 0) {
    return 'This removes the network. Everyone in it is also in another network, so no people are deleted.';
  }
  const who =
    onlyPeopleCount === 1
      ? "1 person who isn't in any other network"
      : `${onlyPeopleCount} people who aren't in any other network`;
  return `This removes the network and its ${who}. People in other networks are kept.`;
}
