import { Concept } from '../types';

export const CONCEPTS: Concept[] = [
  {
    id: 'arrays',
    name: 'Arrays',
    category: 'Core Data Structures',
    difficulty: 'Beginner',
    shortDescription: 'Contiguous memory blocks offering O(1) random access by index.',
    whatItIs: 'An array stores elements of the same type in contiguous memory locations. It allows instant O(1) access by index, but inserting or deleting elements from arbitrary positions takes O(N) because subsequent elements must be shifted.',
    whenToRecognize: [
      'Contiguous subsegment questions (subarrays)',
      'In-place element modifications with O(1) extra space',
      'Prefix sums or running totals',
      'Frequency arrays when character/number range is small'
    ],
    commonPatterns: [
      {
        name: 'Prefix Sum',
        description: 'Precompute cumulative sums to answer range sum queries in O(1) time.',
        problemExample: 'Range Sum Query - Immutable, Subarray Sum Equals K'
      },
      {
        name: 'In-Place Partitioning / Dutch National Flag',
        description: 'Rearranging elements based on a pivot using swapping without extra memory.',
        problemExample: 'Sort Colors (0, 1, 2), Move Zeroes'
      }
    ],
    simpleExample: {
      problem: 'Compute running prefix sum of an array',
      explanation: 'Transform an array so each position i holds the sum of elements from 0 to i.',
      codeSnippet: `def running_sum(nums):\n    for i in range(1, len(nums)):\n        nums[i] += nums[i - 1]\n    return nums`,
      language: 'python'
    },
    commonMistakes: [
      'Off-by-one errors on boundary indices (0 vs length - 1)',
      'Modifying an array while iterating over it in forward order',
      'Assuming resizing a dynamic array is always free (it is amortized O(1), worst-case O(N))'
    ],
    complexityTradeoffs: {
      time: 'Access: O(1) | Search: O(N) | Insertion/Deletion at end: O(1) amortized | Insertion/Deletion middle: O(N)',
      space: 'O(N) memory, contiguous cache-friendly allocation',
      notes: 'Cache locality makes arrays drastically faster in practice than linked lists.'
    },
    practiceQuestion: {
      question: 'Which operation on a fixed-size dynamic array takes O(N) time in the worst case?',
      options: [
        'Reading nums[i]',
        'Appending an element when capacity is full',
        'Getting the length of the array',
        'Overwriting nums[0] with a new value'
      ],
      answerIndex: 1,
      explanation: 'When capacity is full, appending requires allocating a new, larger memory block and copying all N elements over, taking O(N) time in that worst-case resize.'
    },
    status: 'Mastered'
  },
  {
    id: 'strings',
    name: 'Strings',
    category: 'Core Data Structures',
    difficulty: 'Beginner',
    shortDescription: 'Sequences of characters with immutability considerations and pattern matching.',
    whatItIs: 'A string is an indexed sequence of characters. In languages like Python and Java, strings are immutable, meaning any concatenation creates a whole new string in memory.',
    whenToRecognize: [
      'Anagram detection or character frequency comparison',
      'Palindrome checks or reversals',
      'Substrings vs subsequences distinction',
      'Pattern matching and parsing'
    ],
    commonPatterns: [
      {
        name: 'Character Frequency Array',
        description: 'Using a fixed-size array of size 26 or 128 instead of a generic hash map for O(1) memory.',
        problemExample: 'Valid Anagram, Group Anagrams'
      },
      {
        name: 'Two Pointers Palindrome Expansion',
        description: 'Expanding outward from center or inward from endpoints.',
        problemExample: 'Longest Palindromic Substring, Valid Palindrome'
      }
    ],
    simpleExample: {
      problem: 'Check if two strings are valid anagrams',
      explanation: 'Count character occurrences using a fixed array of size 26.',
      codeSnippet: `def isAnagram(s: str, t: str) -> bool:\n    if len(s) != len(t):\n        return False\n    count = [0] * 26\n    for c1, c2 in zip(s, t):\n        count[ord(c1) - ord('a')] += 1\n        count[ord(c2) - ord('a')] -= 1\n    return all(x == 0 for x in count)`,
      language: 'python'
    },
    commonMistakes: [
      'Repeatedly doing s += char inside a loop (creates O(N^2) time due to string copying)',
      'Confusing substring (contiguous) with subsequence (order preserved, but non-contiguous)',
      'Ignoring case sensitivity and non-alphanumeric characters'
    ],
    complexityTradeoffs: {
      time: 'Comparison / Hashing: O(L) where L is string length | Index access: O(1)',
      space: 'O(L) storage; use StringBuilder or list join for O(N) aggregations',
      notes: 'Always use list appends and join for assembling strings dynamically.'
    },
    practiceQuestion: {
      question: 'What is the time complexity of repeatedly appending a single character to a string inside a loop of N iterations in Java/Python (without StringBuilder/list)?',
      options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(2^N)'],
      answerIndex: 2,
      explanation: 'Because strings are immutable, each concatenation creates a new string copying all current i characters, yielding 1 + 2 + ... + N = O(N^2) total time.'
    },
    status: 'Mastered'
  },
  {
    id: 'hashing',
    name: 'Hashing',
    category: 'Core Data Structures',
    difficulty: 'Beginner',
    shortDescription: 'Key-value mapping using hash functions for O(1) average lookup and insertion.',
    whatItIs: 'A Hash Table maps keys to values by running keys through a hash function to compute a bucket index. It converts an O(N) linear search into an O(1) expected lookup.',
    whenToRecognize: [
      '"Find if a complement exists" (Two Sum, 4Sum)',
      '"Count frequencies of items" (First Unique Character)',
      '"Find duplicates in an array"',
      '"Group items by shared property or signature" (Group Anagrams)'
    ],
    commonPatterns: [
      {
        name: 'Complement Lookup',
        description: 'As you iterate, check if (target - current) is already in the map.',
        problemExample: 'Two Sum, 4Sum II'
      },
      {
        name: 'Prefix Sum + Hash Map',
        description: 'Track running prefix sums to find subarrays summing to K in O(N).',
        problemExample: 'Subarray Sum Equals K, Continuous Subarray Sum'
      }
    ],
    simpleExample: {
      problem: 'Find the first non-repeating character in a string',
      explanation: 'Count frequencies in one pass, find first char with count == 1 in second pass.',
      codeSnippet: `from collections import Counter\ndef firstUniqChar(s: str) -> int:\n    counts = Counter(s)\n    for i, ch in enumerate(s):\n        if counts[ch] == 1:\n            return i\n    return -1`,
      language: 'python'
    },
    commonMistakes: [
      'Using unhashable types as keys (e.g. lists in Python; convert to tuples)',
      'Forgetting hash collisions can cause worst-case O(N) operations if poorly distributed',
      'Over-relying on hash map when a simple boolean or integer array would use 10x less memory'
    ],
    complexityTradeoffs: {
      time: 'Average Lookup / Insert / Delete: O(1) | Worst-case: O(N)',
      space: 'O(N) memory overhead due to load factors and bucket pointers',
      notes: 'Trade memory for speed. If keys are integers within [0, M], an array is faster.'
    },
    practiceQuestion: {
      question: 'Why does Subarray Sum Equals K use a Hash Map of prefix sums instead of a simple set?',
      options: [
        'A set cannot store negative numbers',
        'Multiple different prefix indices can have the exact same prefix sum',
        'Sets have slower average lookup than maps',
        'Maps automatically sort their keys'
      ],
      answerIndex: 1,
      explanation: 'If multiple prefix points have the same cumulative sum (e.g., when 0s or canceling negatives are present), each occurrence contributes to a valid subarray, so we must count frequencies.'
    },
    status: 'In Progress'
  },
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    category: 'Algorithmic Techniques',
    difficulty: 'Intermediate',
    shortDescription: 'Iterating with two coordinate indices either moving towards each other or in lockstep.',
    whatItIs: 'Two Pointers is a technique where two indices traverse a data structure (usually an array or string) concurrently. It eliminates a nested loop, converting O(N^2) brute-force searches into O(N) linear time.',
    whenToRecognize: [
      'The array is sorted (or can be sorted without violating problem conditions)',
      'Searching for pairs that satisfy an inequality or sum',
      'In-place array compaction (e.g. remove duplicates, move zeroes)',
      'Reversing or checking symmetries'
    ],
    commonPatterns: [
      {
        name: 'Opposite Ends (Left & Right)',
        description: 'Start at extremes; move left rightward if too small, move right leftward if too large.',
        problemExample: 'Two Sum II - Input Array Is Sorted, Container With Most Water, 3Sum'
      },
      {
        name: 'Fast & Slow Pointers',
        description: 'Slow pointer marks placement destination; fast pointer scouts ahead.',
        problemExample: 'Remove Duplicates from Sorted Array, Move Zeroes'
      }
    ],
    simpleExample: {
      problem: 'Container With Most Water',
      explanation: 'Maximize min(height[left], height[right]) * (right - left) by always advancing the shorter line.',
      codeSnippet: `def maxArea(height: list[int]) -> int:\n    left, right = 0, len(height) - 1\n    max_water = 0\n    while left < right:\n        w = right - left\n        h = min(height[left], height[right])\n        max_water = max(max_water, w * h)\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return max_water`,
      language: 'python'
    },
    commonMistakes: [
      'Advancing the wrong pointer (e.g. moving the taller bar instead of the shorter in Container With Most Water)',
      'Forgetting to skip duplicates when searching for unique triplets/pairs',
      'Pointer crossover condition: mixing up `left < right` with `left <= right`'
    ],
    complexityTradeoffs: {
      time: 'O(N) single pass if already sorted | O(N log N) if sorting is required',
      space: 'O(1) auxiliary space (in-place pointers)',
      notes: 'Extremely memory efficient because no hash table or recursion stack is needed.'
    },
    practiceQuestion: {
      question: 'In the Container With Most Water problem, why is moving the taller bar guaranteed to never produce a larger area?',
      options: [
        'The width decreases by 1, and the height can never exceed the shorter bar bottleneck',
        'The taller bar will cause an array index out of bounds',
        'The width increases by 1',
        'It changes the time complexity from O(N) to O(N log N)'
      ],
      answerIndex: 0,
      explanation: 'The height is bounded by min(h[l], h[r]). If you move the taller bar, width strictly shrinks from (w to w-1) while height is still capped by the unchanged shorter bar, so area cannot increase.'
    },
    status: 'In Progress'
  },
  {
    id: 'sliding-window',
    name: 'Sliding Window',
    category: 'Algorithmic Techniques',
    difficulty: 'Intermediate',
    shortDescription: 'Maintaining a contiguous subsegment window [left, right] to find optimal ranges.',
    whatItIs: 'Sliding Window maintains a valid contiguous range of elements. The `right` pointer expands the window until it becomes invalid, and the `left` pointer contracts the window until validity is restored.',
    whenToRecognize: [
      '"Longest/shortest contiguous subarray/substring satisfying a condition"',
      '"Subarray of fixed size K with maximum sum or property"',
      '"At most K distinct elements"',
      'Monotonic property: expanding window never makes a condition "more valid" if it has strict capacity'
    ],
    commonPatterns: [
      {
        name: 'Fixed-Size Window',
        description: 'Window size K is constant; slide forward by adding nums[i] and removing nums[i - K].',
        problemExample: 'Maximum Sum Subarray of Size K, Permutation in String'
      },
      {
        name: 'Dynamic Expanding/Shrinking Window',
        description: 'Expand right pointer; while condition violated, increment left pointer.',
        problemExample: 'Minimum Size Subarray Sum, Longest Substring Without Repeating Characters'
      }
    ],
    simpleExample: {
      problem: 'Minimum size subarray with sum >= target',
      explanation: 'Expand right to reach target sum, then shrink left to minimize window length.',
      codeSnippet: `def minSubArrayLen(target: int, nums: list[int]) -> int:\n    left = 0\n    current_sum = 0\n    min_len = float('inf')\n    for right in range(len(nums)):\n        current_sum += nums[right]\n        while current_sum >= target:\n            min_len = min(min_len, right - left + 1)\n            current_sum -= nums[left]\n            left += 1\n    return min_len if min_len != float('inf') else 0`,
      language: 'python'
    },
    commonMistakes: [
      'Applying sliding window when array contains negative numbers (breaks monotonic sum property)',
      'Shrinking left using an `if` instead of a `while` loop',
      'Incorrect window length formula: it is `right - left + 1`, not `right - left`'
    ],
    complexityTradeoffs: {
      time: 'O(N) because left and right pointers both move forward at most N times',
      space: 'O(1) to O(K) for window state (like a frequency table)',
      notes: 'Even with a nested while loop, the aggregate work across the entire array is 2N operations.'
    },
    practiceQuestion: {
      question: 'Why does the standard two-pointer sliding window fail for "Subarray Sum Equals K" when numbers can be negative?',
      options: [
        'Negative numbers cause integer overflow',
        'Adding an element does not monotonically increase the window sum, so shrinking decisions are invalid',
        'Negative numbers cannot be stored in an array',
        'The right pointer cannot iterate past 0'
      ],
      answerIndex: 1,
      explanation: 'Sliding window relies on monotonicity (expanding increases sum, shrinking decreases sum). With negative numbers, adding an element could decrease sum, destroying the invariant. (Prefix sums + Hash Map must be used instead).'
    },
    status: 'Needs Review'
  },
  {
    id: 'stack',
    name: 'Stack',
    category: 'Core Data Structures',
    difficulty: 'Intermediate',
    shortDescription: 'LIFO structure essential for nested matching, parsing, and monotonic order.',
    whatItIs: 'A Stack is a Last-In, First-Out (LIFO) data structure. The element added last is the first one removed. It is the fundamental mechanism behind recursion, syntax parsing, and monotonic filtering.',
    whenToRecognize: [
      '"Parentheses matching or nested brackets"',
      '"Evaluate expression or undo operations"',
      '"Next greater element" or "Previous smaller element" (Monotonic Stack)',
      '"Largest rectangle in histogram" or "Daily Temperatures"'
    ],
    commonPatterns: [
      {
        name: 'Monotonic Stack',
        description: 'Maintain elements in strictly increasing or decreasing order by popping violators.',
        problemExample: 'Daily Temperatures, Next Greater Element, Largest Rectangle in Histogram'
      },
      {
        name: 'Parsing & Parentheses Matching',
        description: 'Push opening tokens; pop and compare on closing tokens.',
        problemExample: 'Valid Parentheses, Basic Calculator'
      }
    ],
    simpleExample: {
      problem: 'Daily Temperatures (Next warmer day)',
      explanation: 'Maintain a decreasing stack of indices. When a warmer day is found, pop and record distance.',
      codeSnippet: `def dailyTemperatures(temps: list[int]) -> list[int]:\n    n = len(temps)\n    res = [0] * n\n    stack = []  # stores indices\n    for i, t in enumerate(temps):\n        while stack and temps[stack[-1]] < t:\n            prev_i = stack.pop()\n            res[prev_i] = i - prev_i\n        stack.append(i)\n    return res`,
      language: 'python'
    },
    commonMistakes: [
      'Popping from an empty stack without checking `if stack:` first',
      'Storing values instead of indices on a monotonic stack when index distance is needed',
      'Confusing strict vs non-strict monotonicity (`<` vs `<=`)'
    ],
    complexityTradeoffs: {
      time: 'Push / Pop / Peek: O(1) | Total traversal with monotonic stack: O(N)',
      space: 'O(N) in worst case',
      notes: 'Every item is pushed at most once and popped at most once in monotonic stacks: amortized O(1).'
    },
    practiceQuestion: {
      question: 'In a monotonic decreasing stack for Next Greater Element, why is the total time complexity O(N) even though there is a while loop inside the for loop?',
      options: [
        'The while loop only runs on odd indices',
        'Each index is pushed onto the stack exactly once and popped at most once across the entire run',
        'The compiler optimizes nested loops automatically',
        'The stack automatically halts at index N / 2'
      ],
      answerIndex: 1,
      explanation: 'Amortized analysis: across the whole array of length N, at most N elements are ever pushed and at most N elements are ever popped. Thus total while loop iterations <= N.'
    },
    status: 'In Progress'
  },
  {
    id: 'queue',
    name: 'Queue & Deque',
    category: 'Core Data Structures',
    difficulty: 'Intermediate',
    shortDescription: 'FIFO structures and double-ended queues for BFS traversal and sliding window max.',
    whatItIs: 'A Queue enforces First-In, First-Out (FIFO). A Deque (Double-Ended Queue) allows O(1) additions and removals from both front and back.',
    whenToRecognize: [
      '"Breadth-First Search (BFS) level-order traversal"',
      '"Shortest path in an unweighted grid or graph"',
      '"Sliding Window Maximum" (Monotonic Deque)',
      '"Task scheduling or buffering requests"'
    ],
    commonPatterns: [
      {
        name: 'BFS Level-by-Level Traversal',
        description: 'Iterate level size `len(queue)` to process nodes row by row.',
        problemExample: 'Binary Tree Level Order Traversal, Rotting Oranges'
      },
      {
        name: 'Monotonic Deque',
        description: 'Keep window indices sorted by value; pop front when expired, pop back when smaller.',
        problemExample: 'Sliding Window Maximum'
      }
    ],
    simpleExample: {
      problem: 'Rotting Oranges (BFS multi-source)',
      explanation: 'Add all initial rotten oranges to queue, then spread rot minute by minute.',
      codeSnippet: `from collections import deque\ndef orangesRotting(grid: list[list[int]]) -> int:\n    queue = deque()\n    fresh = 0\n    for r in range(len(grid)):\n        for c in range(len(grid[0])):\n            if grid[r][c] == 2: queue.append((r, c, 0))\n            elif grid[r][c] == 1: fresh += 1\n    time = 0\n    while queue:\n        r, c, time = queue.popleft()\n        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:\n                grid[nr][nc] = 2\n                fresh -= 1\n                queue.append((nr, nc, time + 1))\n    return time if fresh == 0 else -1`,
      language: 'python'
    },
    commonMistakes: [
      'Using `list.pop(0)` in Python instead of `collections.deque.popleft()` (pop(0) is O(N)!)',
      'Forgetting to freeze level size `len(q)` when doing batch level-by-level BFS processing',
      'Forgetting to mark nodes visited at queue insertion time (leads to duplicate queue entries)'
    ],
    complexityTradeoffs: {
      time: 'Enqueue / Dequeue: O(1)',
      space: 'O(W) where W is maximum width of tree/graph layer (up to O(N))',
      notes: 'Always mark nodes visited immediately when pushing into the queue, NOT when popping.'
    },
    practiceQuestion: {
      question: 'In a BFS graph traversal, what bug occurs if you mark a node as "visited" upon popping instead of upon pushing to the queue?',
      options: [
        'The code crashes with recursion depth exceeded',
        'Duplicate identical nodes are added to the queue from different neighbors, exploding memory and time',
        'The shortest path length is calculated incorrectly',
        'The queue reverses order'
      ],
      answerIndex: 1,
      explanation: 'If a node is shared by multiple neighbors in the same tier, all of them will push it to the queue before the first one pops and marks it, causing exponential duplicate visits.'
    },
    status: 'In Progress'
  },
  {
    id: 'linked-list',
    name: 'Linked List',
    category: 'Core Data Structures',
    difficulty: 'Intermediate',
    shortDescription: 'Nodes linked by pointers, ideal for fast splices and LRU Cache implementations.',
    whatItIs: 'A Linked List is a linear collection of data elements where order is not given by their physical placement in memory, but rather through pointer references linking each node to its neighbor.',
    whenToRecognize: [
      '"Reversal of sublists" (Reverse Linked List)',
      '"Cycle detection in references" (Floyd’s Tortoise and Hare)',
      '"Merge two sorted lists"',
      '"Constant-time removals and re-insertions" (LRU Cache with Doubly Linked List)'
    ],
    commonPatterns: [
      {
        name: 'Dummy Head Node',
        description: 'Create a synthetic node before head to eliminate edge cases for head updates.',
        problemExample: 'Merge Two Sorted Lists, Remove Nth Node From End'
      },
      {
        name: 'Fast and Slow Pointers (Floyd Cycle Finding)',
        description: 'Fast moves 2 steps, slow moves 1 step; collision indicates cycle.',
        problemExample: 'Linked List Cycle, Find the Duplicate Number'
      }
    ],
    simpleExample: {
      problem: 'Reverse a Singly Linked List in-place',
      explanation: 'Iteratively rewire each node pointer backward using prev, curr, and nxt.',
      codeSnippet: `def reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev`,
      language: 'python'
    },
    commonMistakes: [
      'Losing reference to `curr.next` before overwriting `curr.next = prev`',
      'Forgetting to update tail pointer in doubly linked list when deleting edge nodes',
      'Not using a dummy node when head might be removed or altered'
    ],
    complexityTradeoffs: {
      time: 'Prepend / Insert after node: O(1) | Search / Access by index: O(N)',
      space: 'O(N) memory with extra pointer overhead per node; lacks CPU cache locality',
      notes: 'Doubly Linked List + Hash Map forms the foundation of LRU Cache.'
    },
    practiceQuestion: {
      question: 'Why is a Dummy Head (sentinel node) widely recommended when mutating linked lists?',
      options: [
        'It speeds up pointer traversal by 50%',
        'It eliminates special conditional code when modifying or deleting the actual first element (head)',
        'It allows random indexing like an array',
        'It automatically prevents memory leaks in C++'
      ],
      answerIndex: 1,
      explanation: 'Without a dummy head, code deleting or merging nodes needs special checks for "is curr == head?". A dummy head ensures every real node always has a non-null predecessor.'
    },
    status: 'In Progress'
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'Algorithmic Techniques',
    difficulty: 'Intermediate',
    shortDescription: 'Halving the search space in O(log N) on sorted data or monotonic answer spaces.',
    whatItIs: 'Binary Search finds the position of a target value within a sorted space by comparing the target to the middle element and halving the search domain on every iteration.',
    whenToRecognize: [
      'The array is sorted or rotated sorted',
      '"Find minimum X such that condition(X) is true" (Binary Search on Answer)',
      '"Find peak element" or local inflection point',
      'Target time complexity is explicitly requested as O(log N)'
    ],
    commonPatterns: [
      {
        name: 'Binary Search on Value / Index',
        description: 'Standard lookup in sorted array with left <= right.',
        problemExample: 'Binary Search, Search in Rotated Sorted Array'
      },
      {
        name: 'Binary Search on Answer Space',
        description: 'Search over possible numerical answers range [low, high] with a boolean feasible() function.',
        problemExample: 'Koko Eating Bananas, Capacity To Ship Packages Within D Days'
      }
    ],
    simpleExample: {
      problem: 'Koko Eating Bananas (Search on Answer)',
      explanation: 'Binary search speed k in [1, max(piles)]. Feasibility check: can she eat all in h hours?',
      codeSnippet: `import math\ndef minEatingSpeed(piles: list[int], h: int) -> int:\n    low, high = 1, max(piles)\n    res = high\n    while low <= high:\n        k = (low + high) // 2\n        hours = sum(math.ceil(p / k) for p in piles)\n        if hours <= h:\n            res = k\n            high = k - 1  # try slower\n        else:\n            low = k + 1   # must go faster\n    return res`,
      language: 'python'
    },
    commonMistakes: [
      'Integer overflow when computing mid = (low + high) / 2 in C++/Java (use low + (high - low) / 2)',
      'Infinite loops due to incorrect boundaries (e.g. low = mid instead of low = mid + 1)',
      'Not recognizing that the problem is a search on answer space rather than search on given input'
    ],
    complexityTradeoffs: {
      time: 'O(log N) for array search | O(N * log(max_val - min_val)) for search on answer',
      space: 'O(1) iterative space',
      notes: 'Condition function must be strictly monotonic: false, false, ..., true, true.'
    },
    practiceQuestion: {
      question: 'Which problem description is a hallmark indicator of "Binary Search on Answer"?',
      options: [
        'Find the longest palindromic substring',
        'Find the minimum capacity or speed such that a job can be finished within K days',
        'Find all permutations of an array',
        'Count the number of strongly connected components'
      ],
      answerIndex: 1,
      explanation: 'When asked to minimize/maximize an answer where a higher value is always feasible and a lower value is not (monotonic feasibility function), binary search on answer is the standard pattern.'
    },
    status: 'In Progress'
  },
  {
    id: 'trees',
    name: 'Trees & BST',
    category: 'Hierarchical Structures',
    difficulty: 'Intermediate',
    shortDescription: 'Hierarchical node structures, DFS traversals, and Binary Search Tree invariants.',
    whatItIs: 'A Tree is an undirected, connected acyclic graph. A Binary Tree restricts each node to at most two children. A Binary Search Tree (BST) enforces that left subtree values < node value < right subtree values.',
    whenToRecognize: [
      'Hierarchical relationships (file systems, organization charts, DOM)',
      '"Lowest Common Ancestor" (LCA)',
      '"Maximum depth, diameter, or path sum in tree"',
      '"Serialize and deserialize a structure"'
    ],
    commonPatterns: [
      {
        name: 'Post-Order Bottom-Up DFS',
        description: 'Collect answers from left and right children, then combine at parent node.',
        problemExample: 'Diameter of Binary Tree, Maximum Path Sum, Lowest Common Ancestor'
      },
      {
        name: 'In-Order Traversal on BST',
        description: 'Visiting left -> root -> right on a BST produces values in strictly sorted order.',
        problemExample: 'Validate Binary Search Tree, Kth Smallest Element in BST'
      }
    ],
    simpleExample: {
      problem: 'Validate Binary Search Tree',
      explanation: 'Pass valid (min_allowed, max_allowed) bounds down the recursion.',
      codeSnippet: `def isValidBST(root) -> bool:\n    def validate(node, low, high):\n        if not node:\n            return True\n        if not (low < node.val < high):\n            return False\n        return validate(node.left, low, node.val) and validate(node.right, node.val, high)\n    return validate(root, float('-inf'), float('inf'))`,
      language: 'python'
    },
    commonMistakes: [
      'Only checking if node.left.val < node.val instead of ensuring ALL descendants on left are smaller',
      'Forgetting that tree recursion consumes O(H) call stack memory, which degrades to O(N) if skewed',
      'Not considering negative node values when computing max path sum'
    ],
    complexityTradeoffs: {
      time: 'O(N) visit every node | BST balanced operations: O(log N)',
      space: 'O(H) recursion stack where H is tree height (log N balanced, N skewed)',
      notes: 'Always consider what info child nodes must return to parent to solve bottom-up.'
    },
    practiceQuestion: {
      question: 'Why is checking `node.left.val < node.val && node.right.val > node.val` at each individual node insufficient to validate a BST?',
      options: [
        'It fails on negative numbers',
        'A node deep in the left subtree could be greater than an ancestor root higher up',
        'It takes O(N^2) time',
        'It causes stack overflow'
      ],
      answerIndex: 1,
      explanation: 'Every node in the left subtree must be smaller than all ancestors above it. Checking only immediate children would miss a left child having a right grandchild larger than the root.'
    },
    status: 'Needs Review'
  },
  {
    id: 'graphs',
    name: 'Graphs',
    category: 'Non-Linear Structures',
    difficulty: 'Advanced',
    shortDescription: 'Networks of vertices and edges with BFS, DFS, Dijkstra, and Topological Sort.',
    whatItIs: 'A Graph is a set of vertices (nodes) connected by edges. They can be directed or undirected, weighted or unweighted, cyclic or acyclic.',
    whenToRecognize: [
      '"Course prerequisites or task dependencies" (Topological Sort / DAG)',
      '"Shortest path between nodes in a network" (BFS or Dijkstra)',
      '"Connected components, flood fill, or islands in 2D grid"',
      '"Bipartite graph coloring or cycle detection"'
    ],
    commonPatterns: [
      {
        name: 'Topological Sort (Kahn\'s Algorithm)',
        description: 'Track in-degrees of nodes; repeatedly remove nodes with in-degree 0 into a queue.',
        problemExample: 'Course Schedule, Course Schedule II, Alien Dictionary'
      },
      {
        name: 'Dijkstra\'s Shortest Path',
        description: 'Use a priority queue (min-heap) to greedily expand shortest weighted paths.',
        problemExample: 'Network Delay Time, Path with Maximum Probability'
      }
    ],
    simpleExample: {
      problem: 'Course Schedule (Detect cycle with Kahn\'s Algorithm)',
      explanation: 'Build adjacency list and in-degree counts. If processed courses != total, cycle exists.',
      codeSnippet: `from collections import deque\ndef canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:\n    adj = {i: [] for i in range(numCourses)}\n    in_degree = [0] * numCourses\n    for dest, src in prerequisites:\n        adj[src].append(dest)\n        in_degree[dest] += 1\n    q = deque([i for i in range(numCourses) if in_degree[i] == 0])\n    visited = 0\n    while q:\n        node = q.popleft()\n        visited += 1\n        for neighbor in adj[node]:\n            in_degree[neighbor] -= 1\n            if in_degree[neighbor] == 0:\n                q.append(neighbor)\n    return visited == numCourses`,
      language: 'python'
    },
    commonMistakes: [
      'Applying Dijkstra on graphs with negative edge weights (requires Bellman-Ford)',
      'Forgetting to build the adjacency list before running BFS/DFS',
      'Not checking for 3-state nodes (unvisited, visiting, visited) during directed cycle detection with DFS'
    ],
    complexityTradeoffs: {
      time: 'BFS / DFS / Kahn\'s: O(V + E) | Dijkstra: O((V + E) log V)',
      space: 'O(V + E) for adjacency list + O(V) for visited array / queue',
      notes: 'A 2D matrix of size M x N is simply a graph where V = M*N and E = 4*M*N.'
    },
    practiceQuestion: {
      question: 'Which algorithm is best suited for finding the shortest path between two points in an UNWEIGHTED graph?',
      options: [
        'Dijkstra\'s Algorithm',
        'Depth-First Search (DFS)',
        'Breadth-First Search (BFS)',
        'Bellman-Ford Algorithm'
      ],
      answerIndex: 2,
      explanation: 'In an unweighted graph, standard BFS expands equidistant concentric rings, guaranteeing that the first time a target node is reached, it is via the shortest path in O(V + E) without heap overhead.'
    },
    status: 'Needs Review'
  },
  {
    id: 'greedy',
    name: 'Greedy Algorithms',
    category: 'Algorithmic Techniques',
    difficulty: 'Intermediate',
    shortDescription: 'Making the locally optimal choice at each step hoping for global optimum.',
    whatItIs: 'A Greedy algorithm builds up a solution piece by piece, always choosing the next piece that offers the most immediate benefit. It only works if the problem has optimal substructure and the greedy-choice property.',
    whenToRecognize: [
      '"Interval scheduling, non-overlapping intervals, meeting rooms"',
      '"Fractional knapsack or gas station circuit"',
      '"Jump Game" (can you reach the last index?)',
      'The problem asks for minimum or maximum, and sorting reveals an obvious local choice'
    ],
    commonPatterns: [
      {
        name: 'Interval Sorting by End Time',
        description: 'Sort intervals by end time to pack maximum non-overlapping events.',
        problemExample: 'Non-overlapping Intervals, Merge Intervals'
      },
      {
        name: 'Farthest Reach Track',
        description: 'Keep a running variable of the farthest reachable index.',
        problemExample: 'Jump Game, Jump Game II'
      }
    ],
    simpleExample: {
      problem: 'Jump Game (Can reach the end?)',
      explanation: 'Track the maximum index reachable so far; if current index exceeds it, return False.',
      codeSnippet: `def canJump(nums: list[int]) -> bool:\n    max_reach = 0\n    for i, jump in enumerate(nums):\n        if i > max_reach:\n            return False\n        max_reach = max(max_reach, i + jump)\n    return True`,
      language: 'python'
    },
    commonMistakes: [
      'Assuming greedy works without proving it (e.g. standard coin change fails for arbitrary denominations)',
      'Sorting intervals by start time instead of end time when finding maximum non-overlapping set',
      'Failing to consider edge cases where initial choice locks out optimal alternatives'
    ],
    complexityTradeoffs: {
      time: 'Typically O(N log N) dominated by sorting, or O(N) single scan',
      space: 'O(1) auxiliary space in most implementations',
      notes: 'If a greedy counterexample exists, the problem is usually Dynamic Programming.'
    },
    practiceQuestion: {
      question: 'When asked to select the maximum number of mutually compatible (non-overlapping) intervals, how should the intervals be sorted?',
      options: [
        'By interval length in ascending order',
        'By interval start time in ascending order',
        'By interval finish (end) time in ascending order',
        'By interval start time in descending order'
      ],
      answerIndex: 2,
      explanation: 'Sorting by end time greedily finishes intervals as early as possible, leaving the maximum remaining time available for subsequent intervals.'
    },
    status: 'In Progress'
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    category: 'Algorithmic Techniques',
    difficulty: 'Advanced',
    shortDescription: 'Exhaustive state space search with systematic pruning of invalid branches.',
    whatItIs: 'Backtracking is an algorithmic technique for solving problems recursively by trying to build a solution incrementally, one piece at a time, removing those solutions that fail to satisfy constraints at any point in time.',
    whenToRecognize: [
      '"Generate all combinations, permutations, or subsets"',
      '"Solve a constraint puzzle" (N-Queens, Sudoku Solver)',
      '"Find all paths from start to end with specific properties"',
      'Constraints are small: N <= 15 or 20 (suggesting O(2^N) or O(N!) factorial scale)'
    ],
    commonPatterns: [
      {
        name: 'Choose -> Explore -> Unchoose (Template)',
        description: 'Append to path, recurse down, pop from path before next branch.',
        problemExample: 'Subsets, Permutations, Combination Sum'
      },
      {
        name: 'Pruning with Visited / Bounds',
        description: 'Check validity before recursing to cut off entire subtrees.',
        problemExample: 'N-Queens, Word Search'
      }
    ],
    simpleExample: {
      problem: 'Generate all Subsets (Power Set)',
      explanation: 'At each index, choose to include nums[i] or exclude it, then backtrack.',
      codeSnippet: `def subsets(nums: list[int]) -> list[list[int]]:\n    res = []\n    path = []\n    def backtrack(start):\n        res.append(list(path))\n        for i in range(start, len(nums)):\n            path.append(nums[i])\n            backtrack(i + 1)\n            path.pop()\n    backtrack(0)\n    return res`,
      language: 'python'
    },
    commonMistakes: [
      'Forgetting to create a copy of the path when appending to result: `res.append(list(path))`',
      'Forgetting the `unchoose` step (`path.pop()`), causing state leakage across branches',
      'Handling duplicates: not sorting beforehand to prune `if i > start and nums[i] == nums[i-1]: continue`'
    ],
    complexityTradeoffs: {
      time: 'Subsets: O(2^N) | Permutations: O(N!) | Combinations: O(C(N, K))',
      space: 'O(N) recursion depth + space for collected solutions',
      notes: 'Small constraints (N <= 20) are the #1 dead giveaway for backtracking in interviews.'
    },
    practiceQuestion: {
      question: 'What subtle bug occurs in Python if you write `res.append(path)` instead of `res.append(list(path))` in a backtracking function?',
      options: [
        'A TypeError: unhashable type exception',
        'All elements inside `res` end up referencing the exact same empty list object at termination',
        'The recursion terminates prematurely',
        'The list is automatically reversed'
      ],
      answerIndex: 1,
      explanation: 'Python passes `path` by reference. When backtracking cleans up and leaves `path` empty, all appended references inside `res` will point to that same empty list. A copy (`list(path)`) is required.'
    },
    status: 'Needs Review'
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic Programming',
    category: 'Algorithmic Techniques',
    difficulty: 'Advanced',
    shortDescription: 'Breaking problems into overlapping subproblems with memoization or tabulation.',
    whatItIs: 'Dynamic Programming (DP) solves complex problems by breaking them down into simpler subproblems, solving each subproblem once, and storing their solutions (memoization or tabulation) to avoid redundant recalculation.',
    whenToRecognize: [
      '"Find the maximum / minimum cost, value, or profit"',
      '"Count the total number of distinct ways to achieve a state"',
      '"Is it possible to partition or reach a target?"',
      'Optimal Substructure + Overlapping Subproblems'
    ],
    commonPatterns: [
      {
        name: '1D State Array (Prefix / Subarray / Coin Change)',
        description: 'dp[i] represents optimal answer ending at or using first i items.',
        problemExample: 'Climbing Stairs, House Robber, Coin Change, Longest Increasing Subsequence'
      },
      {
        name: '2D Grid / String Comparison (LCS / Edit Distance)',
        description: 'dp[i][j] represents optimal answer comparing prefix s1[:i] with s2[:j].',
        problemExample: 'Longest Common Subsequence, Edit Distance, Unique Paths'
      },
      {
        name: '0/1 Knapsack & Unbounded Knapsack',
        description: 'Decide whether to include or exclude item i with given remaining weight.',
        problemExample: 'Partition Equal Subset Sum, Target Sum'
      }
    ],
    simpleExample: {
      problem: 'House Robber (Cannot rob adjacent houses)',
      explanation: 'At house i, max profit is max(rob house i + dp[i-2], skip house i + dp[i-1]).',
      codeSnippet: `def rob(nums: list[int]) -> int:\n    prev2, prev1 = 0, 0\n    for n in nums:\n        curr = max(prev1, prev2 + n)\n        prev2 = prev1\n        prev1 = curr\n    return prev1`,
      language: 'python'
    },
    commonMistakes: [
      'Not clearly defining what `dp[i]` or `dp[i][j]` semantically represents before writing code',
      'Messing up base cases (e.g. dp[0] = 0 vs dp[0] = 1)',
      'Allocating a large 2D matrix when only the previous row/state was needed (space optimization to O(N))'
    ],
    complexityTradeoffs: {
      time: 'Number of states * Transitions per state (e.g. O(N), O(N^2), O(N * Target))',
      space: 'O(N) or O(N * M); frequently reducible to O(1) or O(M) using rolling variables',
      notes: 'Always state: 1. State definition, 2. Base case, 3. Transition recurrence, 4. Answer location.'
    },
    practiceQuestion: {
      question: 'What are the two mandatory mathematical properties a problem must possess for Dynamic Programming to be applicable?',
      options: [
        'Sorted inputs and constant space complexity',
        'Optimal substructure and overlapping subproblems',
        'Monotonicity and greedy choice property',
        'Acyclic edges and linear time complexity'
      ],
      answerIndex: 1,
      explanation: 'Optimal substructure (optimal solution to the problem contains optimal solutions to subproblems) and overlapping subproblems (recursive calls repeatedly solve the same subproblems) are the defining requirements of DP.'
    },
    status: 'Needs Review'
  }
];
