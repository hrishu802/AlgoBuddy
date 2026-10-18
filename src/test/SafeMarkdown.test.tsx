import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafeMarkdown } from '../components/SafeMarkdown';

describe('SafeMarkdown Component', () => {
  it('renders plain text and empty content safely', () => {
    const { container: emptyContainer } = render(<SafeMarkdown content="" />);
    expect(emptyContainer.firstChild).toBeNull();

    const { getByText } = render(<SafeMarkdown content="Just a simple plain text message." />);
    expect(getByText('Just a simple plain text message.')).toBeDefined();
  });

  it('renders headings and bold/italic emphasis', () => {
    const content = `### Step 1: Constraints Check\n\nNotice **key condition** and *careful invariant*.`;
    const { container } = render(<SafeMarkdown content={content} />);

    const heading = container.querySelector('h3');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('Step 1: Constraints Check');

    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('key condition');

    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('careful invariant');
  });

  it('renders unordered and ordered lists correctly', () => {
    const content = `- First bullet\n- Second bullet\n\n1. Numbered one\n2. Numbered two`;
    const { container } = render(<SafeMarkdown content={content} />);

    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBe(1);
    const lis = uls[0].querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('First bullet');

    const ols = container.querySelectorAll('ol');
    expect(ols.length).toBe(1);
    const olis = ols[0].querySelectorAll('li');
    expect(olis.length).toBe(2);
    expect(olis[0].textContent).toBe('Numbered one');
  });

  it('renders bullet points starting with • symbol as list items', () => {
    const content = `• Time Complexity: O(N)\n• Space Complexity: O(1)`;
    const { container } = render(<SafeMarkdown content={content} />);

    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBe(1);
    const lis = uls[0].querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toContain('Time Complexity: O(N)');
  });

  it('renders inline code and fenced code blocks with copy action', () => {
    const content = "Use `nums[i]` in your hash map.\n\n```python\ndef two_sum(nums, target):\n    return [0, 1]\n```";
    const { container, getByText } = render(<SafeMarkdown content={content} />);

    // Inline code
    const inlineCode = container.querySelector('code');
    expect(inlineCode).not.toBeNull();
    expect(inlineCode?.textContent).toBe('nums[i]');

    // Fenced code block
    expect(getByText('python')).toBeDefined();
    expect(getByText(/def two_sum/)).toBeDefined();

    // Copy action
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    });

    const copyBtn = screen.getByTitle('Copy code');
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith('def two_sum(nums, target):\n    return [0, 1]');
    expect(screen.getByText('Copied')).toBeDefined();
  });

  it('sanitizes malicious script tags and hostile HTML input (prevents XSS)', () => {
    const hostileContent = `<script>alert('xss')</script><img src="x" onerror="alert(1)" /><b>Bold HTML</b>`;
    const { container } = render(<SafeMarkdown content={hostileContent} />);

    // Must NOT contain unescaped script tag or executed img tag in DOM
    const scriptElements = container.querySelectorAll('script');
    expect(scriptElements.length).toBe(0);

    const imgElements = container.querySelectorAll('img');
    expect(imgElements.length).toBe(0);

    // Text content is treated as literal string
    expect(container.textContent).toContain("<script>alert('xss')</script>");
    expect(container.textContent).toContain('<img src="x" onerror="alert(1)" />');
  });

  it('rejects dangerous link protocols like javascript: and allows safe https: links', () => {
    const content = `[Safe Link](https://algo.guide) and [Hostile Link](javascript:alert(document.cookie))`;
    const { container, getByText } = render(<SafeMarkdown content={content} />);

    // Safe link
    const safeAnchor = getByText('Safe Link').closest('a');
    expect(safeAnchor).not.toBeNull();
    expect(safeAnchor?.getAttribute('href')).toBe('https://algo.guide');
    expect(safeAnchor?.getAttribute('rel')).toContain('noopener');

    // Hostile link must NOT have href with javascript:
    const hostileElement = getByText('Hostile Link');
    expect(hostileElement.tagName.toLowerCase()).not.toBe('a');
    expect(hostileElement.getAttribute('href')).toBeNull();
  });
});
