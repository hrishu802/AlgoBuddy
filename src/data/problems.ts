import { Problem } from '../types';

export const PROBLEMS: Problem[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Hashing',
    tags: ['Array', 'Hash Table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'nums[1] + nums[2] == 6, so we return [1, 2].'
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]'
      }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    starterCode: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass`,
      javascript: `function twoSum(nums, target) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Check all pairs (i, j) with two nested loops and check if nums[i] + nums[j] == target.',
      time: 'O(N^2)',
      space: 'O(1)'
    },
    optimalPattern: 'Hash Table / Complement Lookup in One Pass',
    optimalComplexity: {
      time: 'O(N)',
      space: 'O(N)'
    },
    hints: {
      nudge: 'Think about what you are constantly searching for as you iterate through the list.',
      hint: 'If you are currently at number x, what exact value would complete the pair to equal target? Can you check for that value in O(1) time?',
      strongHint: 'For every element x, the complement is (target - x). Store previously seen numbers in a Hash Map mapping value -> index.',
      explain: 'As you iterate through nums with index i: calculate complement = target - nums[i]. Check if complement exists in your hash map. If yes, return [hash_map[complement], i]. If no, store nums[i] in the hash map with its index i.',
      solution: {
        language: 'python',
        code: `def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
        explanation: 'We iterate through the array once. At each step, we compute complement = target - num. If it is already in our dictionary, we have found the two indices in O(1) lookup. Otherwise, we record the current number and index into seen. Time: O(N), Space: O(N).'
      }
    },
    socraticQuestions: [
      'What is the maximum time complexity acceptable given N <= 10^4?',
      'If you could search previous elements in O(1) time, how would your approach change?',
      'Why does the brute force do redundant work?'
    ]
  },
  {
    id: 'three-sum',
    title: '3Sum',
    difficulty: 'Medium',
    category: 'Two Pointers',
    tags: ['Array', 'Two Pointers', 'Sorting'],
    description: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      {
        input: 'nums = [-1,0,1,2,-1,-4]',
        output: '[[-1,-1,2],[-1,0,1]]',
        explanation: 'nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0. nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0. Distinct triplets are [-1,0,1] and [-1,-1,2].'
      },
      {
        input: 'nums = [0,1,1]',
        output: '[]',
        explanation: 'The only possible triplet does not sum up to 0.'
      }
    ],
    constraints: [
      '3 <= nums.length <= 3000',
      '-10^5 <= nums[i] <= 10^5'
    ],
    starterCode: {
      python: `def threeSum(nums: list[int]) -> list[list[int]]:\n    # Write your solution here\n    pass`,
      javascript: `function threeSum(nums) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Three nested loops checking all triplets (i, j, k) and using a set to filter duplicates.',
      time: 'O(N^3)',
      space: 'O(N) for set'
    },
    optimalPattern: 'Sort Array + Fix 1 Element + Two Pointers',
    optimalComplexity: {
      time: 'O(N^2)',
      space: 'O(1) auxiliary (excluding output)'
    },
    hints: {
      nudge: 'Can we reduce a 3-variable problem into a 2-variable problem we already know how to solve?',
      hint: 'If the array is sorted, how can two pointers from left and right find two numbers summing to a fixed target in O(N)?',
      strongHint: 'Sort nums. Loop i from 0 to N-1. If nums[i] > 0, break (since elements after are positive). Use left = i + 1 and right = N - 1. Be careful to skip duplicate values for both i, left, and right.',
      explain: 'Sort the array. For each index i, fix nums[i]. We need nums[left] + nums[right] == -nums[i]. If the sum is too small, increment left. If too big, decrement right. If equal, record the triplet and advance both pointers past duplicate values.',
      solution: {
        language: 'python',
        code: `def threeSum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    res = []
    n = len(nums)
    
    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        if nums[i] > 0:
            break
            
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                res.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
    return res`,
        explanation: 'Sorting takes O(N log N). Outer loop runs N times, inner two-pointer search runs in O(N). Duplicate skipping prevents redundant triplets without an expensive hash set.'
      }
    },
    socraticQuestions: [
      'Why is sorting acceptable here even though it costs O(N log N)?',
      'How does sorting help us handle duplicate triplets cleanly?',
      'If nums[i] > 0 in a sorted array, can any triplet starting at i sum to 0?'
    ]
  },
  {
    id: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'Sliding Window',
    tags: ['Hash Table', 'String', 'Sliding Window'],
    description: `Given a string \`s\`, find the length of the **longest substring** without duplicate characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3. Note that the answer must be a substring, "pwke" is a subsequence and not a substring.'
      }
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    starterCode: {
      python: `def lengthOfLongestSubstring(s: str) -> int:\n    # Write your solution here\n    pass`,
      javascript: `function lengthOfLongestSubstring(s) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Check every possible substring (i to j), verify uniqueness with a set, and track max length.',
      time: 'O(N^3)',
      space: 'O(min(N, alphabet_size))'
    },
    optimalPattern: 'Dynamic Sliding Window with Hash Map / Index Cache',
    optimalComplexity: {
      time: 'O(N)',
      space: 'O(min(N, alphabet_size))'
    },
    hints: {
      nudge: 'When you encounter a character that already appeared in your current window, do you need to restart from scratch?',
      hint: 'Maintain a window [left, right]. As right expands, if s[right] is already in the window, where should left jump to?',
      strongHint: 'Store the last seen index of each character in a hash map. When s[right] is seen at index prev_idx >= left, move left to prev_idx + 1.',
      explain: 'Use a map `char_index_map`. Iterate `right` from 0 to len(s)-1. If `s[right]` is in the map and its index >= `left`, update `left = char_index_map[s[right]] + 1`. Update `char_index_map[s[right]] = right`, and record `max_len = max(max_len, right - left + 1)`.',
      solution: {
        language: 'python',
        code: `def lengthOfLongestSubstring(s: str) -> int:
    last_seen = {}
    left = 0
    max_len = 0
    
    for right, char in enumerate(s):
        if char in last_seen and last_seen[char] >= left:
            left = last_seen[char] + 1
        last_seen[char] = right
        max_len = max(max_len, right - left + 1)
        
    return max_len`,
        explanation: 'Each character is visited once by the right pointer. Left jumps forward directly without stepping one by one. Time is O(N) and space is bounded by the alphabet size (at most 128 for ASCII).'
      }
    },
    socraticQuestions: [
      'What constitutes the invariant of the sliding window here?',
      'Why is moving `left` directly to `last_seen[char] + 1` safe?',
      'What happens if the last seen index is smaller than `left`?'
    ]
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    tags: ['String', 'Stack'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true'
      },
      {
        input: 's = "()[]{}"',
        output: 'true'
      },
      {
        input: 's = "(]"',
        output: 'false'
      }
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.'
    ],
    starterCode: {
      python: `def isValid(s: str) -> bool:\n    # Write your solution here\n    pass`,
      javascript: `function isValid(s) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Repeatedly replace "()", "[]", "{}" with empty string until length stops changing.',
      time: 'O(N^2)',
      space: 'O(N)'
    },
    optimalPattern: 'Last-In First-Out (LIFO) Stack with Matching Map',
    optimalComplexity: {
      time: 'O(N)',
      space: 'O(N)'
    },
    hints: {
      nudge: 'When you see a closing bracket, which open bracket must it pair with?',
      hint: 'The most recently opened bracket must be the first one to be closed. What data structure naturally models Last-In, First-Out?',
      strongHint: 'Push opening brackets onto a stack. When encountering a closing bracket, check if the stack is non-empty and the top matches the corresponding opener. Pop it if valid.',
      explain: 'Create a mapping of closing bracket to opening bracket: {")": "(", "}": "{", "]": "["}. Iterate through each char in s. If it is an opening bracket, push to stack. If it is a closing bracket, pop from stack (or fail if empty) and verify it matches. At the end, check if stack is empty.',
      solution: {
        language: 'python',
        code: `def isValid(s: str) -> bool:
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    for char in s:
        if char in pairs:
            top_element = stack.pop() if stack else '#'
            if pairs[char] != top_element:
                return False
        else:
            stack.append(char)
            
    return not stack`,
        explanation: 'We iterate through string s once. Each character is pushed or popped at most once, giving O(N) time. The stack holds at most N elements, giving O(N) space.'
      }
    },
    socraticQuestions: [
      'Why is a Queue not appropriate for matching brackets?',
      'What are the edge cases: what if the string starts with a closing bracket, or has odd length?'
    ]
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    category: 'Two Pointers',
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Monotonic Stack'],
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.'
      },
      {
        input: 'height = [4,2,0,3,2,5]',
        output: '9'
      }
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    starterCode: {
      python: `def trap(height: list[int]) -> int:\n    # Write your solution here\n    pass`,
      javascript: `function trap(height) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public int trap(int[] height) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'For each element i, scan left to find max_left and scan right to find max_right. Water trapped at i is max(0, min(max_left, max_right) - height[i]).',
      time: 'O(N^2)',
      space: 'O(1)'
    },
    optimalPattern: 'Two Pointers / Left & Right Max Invariant',
    optimalComplexity: {
      time: 'O(N)',
      space: 'O(1)'
    },
    hints: {
      nudge: 'At any bar i, what determines the height of water it can hold above it?',
      hint: 'Water at bar i is min(max_height_to_left, max_height_to_right) - height[i]. Can we maintain max_left and max_right without scanning every time?',
      strongHint: 'Use two pointers `left` and `right`. If `left_max < right_max`, the water trapped at `left` is strictly bounded by `left_max` regardless of whatever taller bars exist further right!',
      explain: 'Initialize left=0, right=len-1, left_max=0, right_max=0, water=0. While left < right: if height[left] < height[right]: if height[left] >= left_max: left_max = height[left]; else: water += left_max - height[left]; left += 1. Else do the symmetric logic for right.',
      solution: {
        language: 'python',
        code: `def trap(height: list[int]) -> int:
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0
    water = 0
    
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
            
    return water`,
        explanation: 'Two pointers traverse the array inward in a single pass. Since we always advance the pointer with the smaller boundary, we are guaranteed that the opposing side is bounded by a bar at least as tall. O(N) time and O(1) space.'
      }
    },
    socraticQuestions: [
      'Why is `min(left_max, right_max)` the bottleneck for water at any index?',
      'If `left_max < right_max`, why do we not care about what bars lie between `left` and `right`?'
    ]
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    tags: ['Array', 'Dynamic Programming', 'Breadth-First Search'],
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: 'coins = [1,2,5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1'
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1'
      },
      {
        input: 'coins = [1], amount = 0',
        output: '0'
      }
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4'
    ],
    starterCode: {
      python: `def coinChange(coins: list[int], amount: int) -> int:\n    # Write your solution here\n    pass`,
      javascript: `function coinChange(coins, amount) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Try all combinations of coins recursively. At each step, subtract each coin from remaining amount.',
      time: 'O(S^n) where S is amount, n is coin count',
      space: 'O(S) recursion stack'
    },
    optimalPattern: 'Bottom-Up Dynamic Programming (Unbounded Knapsack)',
    optimalComplexity: {
      time: 'O(amount * len(coins))',
      space: 'O(amount)'
    },
    hints: {
      nudge: 'Does greedy always pick the optimal coin combination? Think about coins = [1, 3, 4] for amount = 6.',
      hint: 'If you knew the minimum coins needed for all amounts from 0 to a - 1, how would you calculate the minimum coins for amount a?',
      strongHint: 'Define dp[a] = min coins to form amount a. dp[a] = 1 + min(dp[a - c]) for all c in coins where a - c >= 0. Base case dp[0] = 0.',
      explain: 'Initialize an array dp of size amount + 1 filled with infinity (or amount + 1). Set dp[0] = 0. Iterate a from 1 to amount: for each coin c in coins: if a - c >= 0: dp[a] = min(dp[a], 1 + dp[a - c]). If dp[amount] > amount, return -1, else return dp[amount].',
      solution: {
        language: 'python',
        code: `def coinChange(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    
    for a in range(1, amount + 1):
        for c in coins:
            if a - c >= 0:
                dp[a] = min(dp[a], 1 + dp[a - c])
                
    return dp[amount] if dp[amount] != float('inf') else -1`,
        explanation: 'We build the solution subproblem by subproblem from 1 up to amount. Outer loop takes O(amount), inner loop runs len(coins) times. Total time O(amount * |coins|), space O(amount).'
      }
    },
    socraticQuestions: [
      'Why fails greedy on coins = [1, 3, 4] and target = 6?',
      'What are the overlapping subproblems in the recursive tree?'
    ]
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    category: 'Graphs',
    tags: ['Array', 'Depth-First Search', 'Breadth-First Search', 'Matrix'],
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return *the number of islands*.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: 'grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
        output: '1'
      },
      {
        input: 'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
        output: '3'
      }
    ],
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is \'0\' or \'1\'.'
    ],
    starterCode: {
      python: `def numIslands(grid: list[list[str]]) -> int:\n    # Write your solution here\n    pass`,
      javascript: `function numIslands(grid) {\n    // Write your solution here\n}`,
      cpp: `class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Write your solution here\n    }\n};`,
      java: `class Solution {\n    public int numIslands(char[][] grid) {\n        // Write your solution here\n    }\n}`
    },
    bruteForce: {
      approach: 'Traverse grid; each time "1" is found, run a graph traversal to mark connected components.',
      time: 'O(M * N)',
      space: 'O(M * N)'
    },
    optimalPattern: 'Connected Components / DFS or BFS Flood Fill',
    optimalComplexity: {
      time: 'O(M * N)',
      space: 'O(M * N) recursion/queue'
    },
    hints: {
      nudge: 'Think of the 2D grid as an undirected graph where each "1" cell is a node connected to up to 4 neighbors.',
      hint: 'When you find a "1", you have discovered a new island. How can you "sink" or mark all connected land so you do not count it twice?',
      strongHint: 'When grid[r][c] == "1", increment island_count and trigger a DFS/BFS from (r, c) marking all reachable "1" cells as "0".',
      explain: 'Iterate over all cells (r, c). When grid[r][c] == "1", increment count by 1 and call dfs(r, c). The dfs function sets grid[r][c] = "0" and recursively visits all valid unvisited cardinal neighbors (r+1, c), (r-1, c), (r, c+1), (r, c-1).',
      solution: {
        language: 'python',
        code: `def numIslands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    islands = 0
    
    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # Mark visited by sinking
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)
        
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                islands += 1
                dfs(r, c)
                
    return islands`,
        explanation: 'Each cell is visited a constant number of times: once in the outer loops, and at most once during DFS (since it is immediately overwritten to "0"). Time is O(M * N), space is O(M * N) in worst case call stack (e.g. grid completely filled with land).'
      }
    },
    socraticQuestions: [
      'Why is changing grid[r][c] to "0" equivalent to maintaining a separate visited set?',
      'What is the worst-case space complexity of the recursion stack?'
    ]
  }
];
