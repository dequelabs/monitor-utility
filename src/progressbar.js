class CustomProgressBar {
  /**
   * Creates a new progress bar
   * @param {number} total - Total number of steps
   * @param {Object} options - Customization options
   */
  constructor(total, options = {}) {
    this.total = total;
    this.current = 0;
    this.options = {
      width: options.width || 30,
      complete: options.complete || "#",
      incomplete: options.incomplete || "-",
      clear: options.clear !== undefined ? options.clear : true,
      showPercent:
        options.showPercent !== undefined ? options.showPercent : true,
      showCount: options.showCount !== undefined ? options.showCount : true,
      message:
        options.message !== undefined ? options.message : "Downloading : ",
    };

    // Store the starting time for ETA calculation
    this.startTime = Date.now();
    this.lastRender = 0;
    this.isCompleted = false;
    this.hasStarted = false;

    // Track terminal state
    this.isTTY = process.stdout.isTTY;
    this.lastOutputLength = 0;
    this.isActive = false;

    // Buffer for pending messages
    this.pendingMessages = [];

    // Ensure we start fresh
    this.clearLine();
  }

  /**
   * Clear the current line completely
   */
  clearLine() {
    if (this.isTTY) {
      // Move cursor to beginning of line and clear entire line
      process.stdout.write("\r\x1b[2K");
    }
  }

  /**
   * Log a message without interfering with the progress bar
   */
  log(message, type = 'info') {
    if (!this.isTTY) {
      console.log(message);
      return;
    }

    if (this.isActive) {
      // Clear current progress bar line
      this.clearLine();
      
      // Print the message
      if (type === 'error') {
        console.error(message);
      } else if (type === 'warn') {
        console.warn(message);
      } else {
        console.log(message);
      }
      
      // Re-render the progress bar
      this.render();
    } else {
      // Buffer the message if progress bar isn't active
      this.pendingMessages.push({ message, type });
    }
  }

  /**
   * Flush any pending messages
   */
  flushPendingMessages() {
    for (const { message, type } of this.pendingMessages) {
      if (type === 'error') {
        console.error(message);
      } else if (type === 'warn') {
        console.warn(message);
      } else {
        console.log(message);
      }
    }
    this.pendingMessages = [];
  }

  increment(increment = 1) {
    if (this.isCompleted) return;

    this.current += increment;

    // Ensure current doesn't exceed total
    if (this.current > this.total) {
      this.current = this.total;
    }

    // Mark as completed if we've reached the total
    if (this.current >= this.total) {
      this.isCompleted = true;
    }

    // Only render if it's been at least 100ms since last render or if completed
    const now = Date.now();
    if (now - this.lastRender >= 100 || this.isCompleted || !this.hasStarted) {
      this.render();
      this.lastRender = now;
      this.hasStarted = true;
    }
  }

  /**
   * Render the progress bar to the console
   */
  render() {
    if (!this.isTTY) {
      // For non-TTY environments, just log progress occasionally
      const percent = Math.floor((this.current / this.total) * 100);
      if (percent % 10 === 0 || this.isCompleted) {
        console.log(
          `${this.options.message} ${percent}% (${this.current}/${this.total})`
        );
      }
      return;
    }

    // Flush any pending messages before starting
    if (!this.isActive && this.pendingMessages.length > 0) {
      this.flushPendingMessages();
    }

    this.isActive = true;

    // Calculate percentage
    const percent = Math.floor((this.current / this.total) * 100);

    // Calculate the number of complete and incomplete characters
    const completeLength = Math.floor(
      (this.current / this.total) * this.options.width
    );
    const incompleteLength = this.options.width - completeLength;

    // Build the progress bar
    const bar =
      this.options.complete.repeat(completeLength) +
      this.options.incomplete.repeat(incompleteLength);

    // Calculate ETA
    let etaText = "";
    if (this.current > 0 && this.current < this.total) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const rate = this.current / elapsed;
      const eta = Math.round((this.total - this.current) / rate);

      if (eta < 60) {
        etaText = `ETA: ${eta}s`;
      } else if (eta < 3600) {
        etaText = `ETA: ${Math.floor(eta / 60)}m ${eta % 60}s`;
      } else {
        etaText = `ETA: ${Math.floor(eta / 3600)}h ${Math.floor(
          (eta % 3600) / 60
        )}m`;
      }
    }

    let output = "";

    if (this.options.message) {
      output += `${this.options.message} `;
    }

    output += `[${bar}]`;

    if (this.options.showPercent) {
      output += ` ${percent}%`;
    }

    if (this.options.showCount) {
      output += ` (${this.current}/${this.total})`;
    }

    if (etaText) {
      output += ` ${etaText}`;
    }

    this.clearLine();

    process.stdout.write(output);

    this.lastOutputLength = output.length;

    if (this.isCompleted) {
      this.isActive = false;
      if (this.options.clear) {
        process.stdout.write("\n");
      }
    }
  }

  update(current) {
    if (this.isCompleted) return;

    this.current = Math.min(current, this.total);

    if (this.current >= this.total) {
      this.isCompleted = true;
    }

    const now = Date.now();
    if (now - this.lastRender >= 100 || this.isCompleted || !this.hasStarted) {
      this.render();
      this.lastRender = now;
      this.hasStarted = true;
    }
  }

  complete() {
    if (this.isCompleted) return;

    this.current = this.total;
    this.isCompleted = true;
    this.render();
  }

  reset() {
    this.current = 0;
    this.isCompleted = false;
    this.hasStarted = false;
    this.isActive = false;
    this.startTime = Date.now();
    this.lastRender = 0;
    this.pendingMessages = [];
    this.clearLine();
  }

  finish() {
    if (this.isTTY && !this.isCompleted) {
      this.complete();
    }
    this.isActive = false;
  }
}

module.exports = CustomProgressBar;
