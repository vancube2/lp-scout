const EventEmitter = require('events');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Chore Runner - Natural language task execution for LP Scout
 * Interprets user instructions and executes them as automated chores
 */
class ChoreRunner extends EventEmitter {
  constructor() {
    super();

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.chores = new Map();
    this.completedChores = [];
    this.isRunning = false;
    this.checkInterval = null;

    // Chore templates for common tasks
    this.choreTemplates = {
      'rebalance': {
        description: 'Rebalance a specific position',
        params: ['positionId', 'reason'],
        execute: this.executeRebalance.bind(this),
      },
      'monitor': {
        description: 'Monitor a pool or position for specific conditions',
        params: ['target', 'condition', 'action'],
        execute: this.executeMonitor.bind(this),
      },
      'alert': {
        description: 'Set up price or PnL alerts',
        params: ['metric', 'threshold', 'direction'],
        execute: this.executeAlert.bind(this),
      },
      'compound': {
        description: 'Auto-compound fees from a position',
        params: ['positionId', 'frequency'],
        execute: this.executeCompound.bind(this),
      },
      'exit': {
        description: 'Exit a position when conditions are met',
        params: ['positionId', 'condition'],
        execute: this.executeExit.bind(this),
      },
    };
  }

  async parseChoreInstruction(instruction, context = {}) {
    try {
      const systemPrompt = `You are LP Scout's Chore Parser. Convert natural language instructions into structured chores.

Available chore types:
- rebalance: Rebalance a position (needs: positionId, reason)
- monitor: Watch a pool/position (needs: target, condition, action)
- alert: Set up alerts (needs: metric, threshold, direction)
- compound: Auto-compound fees (needs: positionId, frequency)
- exit: Exit position (needs: positionId, condition)

Current context:
${JSON.stringify(context, null, 2)}

Parse this instruction into a structured chore. If unclear, ask clarifying questions.
Return JSON format:
{
  "type": "chore_type",
  "description": "human readable description",
  "params": { /* extracted parameters */ },
  "confidence": 0.0-1.0,
  "questions": [ /* if confidence < 0.7 */ ]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: instruction }],
      });

      const content = response.content[0].text;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse chore from response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: `chore_${Date.now()}`,
        instruction,
        ...parsed,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to parse chore:', error);
      return {
        id: `chore_${Date.now()}`,
        instruction,
        type: 'unknown',
        description: instruction,
        params: {},
        confidence: 0,
        status: 'failed',
        error: error.message,
        createdAt: new Date().toISOString(),
      };
    }
  }

  async createChore(instruction, context = {}) {
    const chore = await this.parseChoreInstruction(instruction, context);

    if (chore.confidence < 0.5) {
      chore.status = 'needs_clarification';
      this.chores.set(chore.id, chore);
      this.emit('choreCreated', chore);
      return chore;
    }

    chore.status = 'active';
    this.chores.set(chore.id, chore);
    this.emit('choreCreated', chore);

    // Start runner if not running
    if (!this.isRunning) {
      this.start();
    }

    return chore;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = setInterval(() => this.checkChores(), 30000); // Check every 30s
    this.emit('started');
  }

  stop() {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('stopped');
  }

  async checkChores() {
    for (const [id, chore] of this.chores.entries()) {
      if (chore.status !== 'active') continue;

      try {
        await this.executeChore(chore);
      } catch (error) {
        console.error(`Chore ${id} failed:`, error);
        chore.status = 'failed';
        chore.error = error.message;
        this.emit('choreFailed', chore);
      }
    }
  }

  async executeChore(chore) {
    const template = this.choreTemplates[chore.type];

    if (!template) {
      throw new Error(`Unknown chore type: ${chore.type}`);
    }

    this.emit('choreExecuting', chore);

    const result = await template.execute(chore.params);

    if (result.complete) {
      chore.status = 'completed';
      chore.completedAt = new Date().toISOString();
      chore.result = result;

      this.completedChores.unshift({
        ...chore,
        executionTime: Date.now() - new Date(chore.createdAt).getTime(),
      });

      // Keep only last 50 completed chores
      if (this.completedChores.length > 50) {
        this.completedChores = this.completedChores.slice(0, 50);
      }

      this.chores.delete(chore.id);
      this.emit('choreCompleted', chore);
    } else {
      // Chore needs to continue monitoring
      this.emit('choreUpdated', chore);
    }
  }

  // Chore execution handlers
  async executeRebalance(params) {
    // Delegate to rebalance engine
    this.emit('requestRebalance', params);
    return { complete: false, message: 'Rebalance requested' };
  }

  async executeMonitor(params) {
    // Check if condition is met
    const { target, condition } = params;

    // This would check actual conditions
    const conditionMet = await this.checkCondition(target, condition);

    if (conditionMet) {
      return { complete: true, action: params.action };
    }

    return { complete: false, nextCheck: Date.now() + 60000 };
  }

  async executeAlert(params) {
    const { metric, threshold, direction } = params;

    // Check if alert condition is triggered
    const currentValue = await this.getMetricValue(metric);
    const triggered = direction === 'above'
      ? currentValue > threshold
      : currentValue < threshold;

    if (triggered) {
      this.emit('alertTriggered', { metric, threshold, currentValue, direction });
      return { complete: true, triggered: true };
    }

    return { complete: false, currentValue };
  }

  async executeCompound(params) {
    const { positionId, frequency } = params;

    // Check if it's time to compound
    const lastCompound = await this.getLastCompoundTime(positionId);
    const frequencyMs = this.parseFrequency(frequency);

    if (Date.now() - lastCompound >= frequencyMs) {
      this.emit('requestCompound', { positionId });
      return { complete: false, message: 'Compound requested' };
    }

    return { complete: false, nextCompound: lastCompound + frequencyMs };
  }

  async executeExit(params) {
    const { positionId, condition } = params;

    const conditionMet = await this.checkCondition(positionId, condition);

    if (conditionMet) {
      this.emit('requestExit', { positionId, condition });
      return { complete: false, message: 'Exit requested' };
    }

    return { complete: false };
  }

  // Helper methods
  async checkCondition(target, condition) {
    // This would check actual on-chain data
    // For now, return false to keep monitoring
    return false;
  }

  async getMetricValue(metric) {
    // This would fetch actual metric values
    return 0;
  }

  async getLastCompoundTime(positionId) {
    // This would fetch from database
    return 0;
  }

  parseFrequency(freq) {
    const units = {
      'minute': 60000,
      'hour': 3600000,
      'day': 86400000,
    };

    const match = freq.match(/(\d+)\s*(minute|hour|day)s?/i);
    if (match) {
      return parseInt(match[1]) * units[match[2].toLowerCase()];
    }

    return 86400000; // Default to daily
  }

  getActiveChores() {
    return Array.from(this.chores.values())
      .filter(c => c.status === 'active' || c.status === 'pending');
  }

  getCompletedChores(limit = 20) {
    return this.completedChores.slice(0, limit);
  }

  getChoreById(id) {
    return this.chores.get(id) || this.completedChores.find(c => c.id === id);
  }

  cancelChore(id) {
    const chore = this.chores.get(id);
    if (chore) {
      chore.status = 'cancelled';
      this.chores.delete(id);
      this.emit('choreCancelled', chore);
      return true;
    }
    return false;
  }

  updateChore(id, updates) {
    const chore = this.chores.get(id);
    if (chore) {
      Object.assign(chore, updates);
      this.emit('choreUpdated', chore);
      return chore;
    }
    return null;
  }
}

module.exports = { ChoreRunner };
