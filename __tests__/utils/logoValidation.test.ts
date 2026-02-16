import { describe, it, expect } from 'vitest';
import { validateLogoUri } from '../../utils/dataUtils';

describe('validateLogoUri', () => {
  it('should accept valid data URLs', () => {
    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKma9wAAAABJRU5ErkJggg==';
    const validJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfX//2Q==';
    const validSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==';
    const validWebp = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73vwcA';

    expect(validateLogoUri(validPng)).toBe(validPng);
    expect(validateLogoUri(validJpeg)).toBe(validJpeg);
    expect(validateLogoUri(validSvg)).toBe(validSvg);
    expect(validateLogoUri(validWebp)).toBe(validWebp);
  });

  it('should accept blob URLs', () => {
    const blobUrl = 'blob:http://localhost:5173/uuid-here';
    expect(validateLogoUri(blobUrl)).toBe(blobUrl);
  });

  it('should accept non-base64 SVG data URLs', () => {
    const svgUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(validateLogoUri(svgUrl)).toBe(svgUrl);
  });

  it('should reject malicious or invalid URLs', () => {
    expect(validateLogoUri('javascript:alert(1)')).toBeUndefined();
    expect(validateLogoUri('data:text/html,<html></html>')).toBeUndefined();
    expect(validateLogoUri('http://malicious.com/image.png')).toBeUndefined();
    expect(validateLogoUri('data:application/octet-stream;base64,AAA')).toBeUndefined();
  });

  it('should handle undefined or empty input', () => {
    expect(validateLogoUri(undefined)).toBeUndefined();
    expect(validateLogoUri('')).toBeUndefined();
  });
});
