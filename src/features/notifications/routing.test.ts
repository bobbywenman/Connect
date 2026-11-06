import { personIdFromResponse, responseKey, routeForResponse, type ResponseLike } from './routing';

const response = (data: unknown, identifier = 'n1'): ResponseLike => ({
  actionIdentifier: 'default',
  notification: { request: { identifier, content: { data } } },
});

describe('notification routing', () => {
  it('routes a reminder tap to the person', () => {
    const r = response({ kind: 'knowthem-reminder', personId: 'abc-123' });
    expect(personIdFromResponse(r)).toBe('abc-123');
    expect(routeForResponse(r)).toBe('/person/abc-123');
  });

  it('ignores notifications without a person', () => {
    expect(routeForResponse(response({}))).toBeNull();
    expect(routeForResponse(response(undefined))).toBeNull();
    expect(routeForResponse(response({ personId: 42 }))).toBeNull();
    expect(routeForResponse(response({ personId: '' }))).toBeNull();
    expect(routeForResponse(null)).toBeNull();
  });

  it('builds a stable key per tap', () => {
    expect(responseKey(response({}, 'x'))).toBe(responseKey(response({}, 'x')));
    expect(responseKey(response({}, 'x'))).not.toBe(responseKey(response({}, 'y')));
  });
});
