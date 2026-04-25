---
title: "Teaching Agents to Write Code: Building RepoGym"
description: "How I built an RL environment for training code generation agents and what it taught me about the intersection of machine learning and software engineering."
date: 2025-11-20
type: "technical"
tags: ["machine-learning", "reinforcement-learning", "code-generation", "AI"]
draft: false
featured: true
---

# Teaching Agents to Write Code: Building RepoGym

Large language models can write code, but can they learn to write *better* code through trial and error? This question led me to build RepoGym, a reinforcement learning environment for training code generation agents.

## The Problem

Traditional code generation treats programming as a sequence prediction problem: given a prompt, predict the most likely code completion. This works remarkably well, but it misses something fundamental about programming.

Real programming is iterative. You write code, run it, see what fails, and revise. This feedback loop is central to how humans learn to code. Why shouldn't it be central to how AI systems learn?

## Designing the Environment

RepoGym frames code generation as a Markov Decision Process:

- **State**: The current code, test results, and error messages
- **Actions**: Code edits (insertions, deletions, modifications)
- **Reward**: Test passage rate, code quality metrics, execution success

```python
class RepoGymEnv(gym.Env):
    """
    An RL environment for code generation tasks.
    Agents learn to modify code to pass test suites.
    """

    def step(self, action: CodeEdit) -> Tuple[State, float, bool, dict]:
        # Apply the edit
        new_code = self.apply_edit(action)

        # Run tests to get feedback
        test_results = self.run_tests(new_code)

        # Calculate reward based on test passage
        reward = self.calculate_reward(test_results)

        # Check if all tests pass (episode complete)
        done = test_results.all_passed

        return self.get_state(), reward, done, {"tests": test_results}
```

## Key Insights

**1. Sparse rewards are challenging.**
Most test suites are binary - either the code passes or it doesn't. This makes credit assignment difficult. I found that auxiliary rewards for partial progress (fewer failing tests, no syntax errors) helped significantly.

**2. The action space matters enormously.**
Originally I allowed arbitrary string edits. This was too unconstrained. Restricting actions to structured AST transformations improved learning stability dramatically.

**3. Context is everything.**
An agent that can see test failure messages, stack traces, and related code learns much faster than one that can only see the code itself. This mirrors how human programmers debug.

## Current Limitations

RepoGym works well for small, well-defined tasks - fixing bugs, implementing single functions. Scaling to larger codebases remains challenging:

- Long context windows strain model capacity
- Test execution time limits training speed
- Reward design becomes more complex

## What's Next

I'm exploring curriculum learning approaches - starting agents on simple tasks and gradually increasing complexity. Early results suggest this helps significantly.

The broader vision is an environment where AI systems can learn software engineering practices through experience, not just pattern matching on static code corpora.

---

*RepoGym is available at [github.com/heyaryansingh/RepoGym](https://github.com/heyaryansingh/RepoGym).*
