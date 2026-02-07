import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button } from '../components/ui/Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    );
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loader and is disabled when isLoading is true', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Click me
      </Button>
    );
    const button = screen.getByRole('button') as HTMLButtonElement;

    // Check if button is disabled
    expect(button.disabled).toBe(true);

    // Check if aria-busy is set
    expect(button.getAttribute('aria-busy')).toBe('true');

    // Check if loader is present
    const loader = button.querySelector('.animate-spin');
    expect(loader).toBeTruthy();

    // Interaction should not trigger event
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies focus-visible styles', () => {
    render(<Button>Focus me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible:ring-2');
  });
});
