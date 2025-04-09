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
        complete: options.complete || '#',
        incomplete: options.incomplete || '-',
        clear: options.clear !== undefined ? options.clear : true,
        showPercent: options.showPercent !== undefined ? options.showPercent : true,
        showCount: options.showCount !== undefined ? options.showCount : true,
        message: options.message !== undefined ? options.message : 'Downloading : ',
      };
      
      // Store the starting time for ETA calculation
      this.startTime = Date.now();
      this.lastRender = 0;
    }
  
    /**
     * Update the progress bar
     * @param {number} increment - Amount to increment by (default: 1)
     */
    increment(increment = 1) {
      this.current += increment;
      
      // Ensure current doesn't exceed total
      if (this.current > this.total) {
        this.current = this.total;
      }
  
      // Only render if it's been at least 50ms since last render (to avoid flicker)
      const now = Date.now();
      if (now - this.lastRender >= 50 || this.current >= this.total) {
        this.render();
        this.lastRender = now;
      }
    }
  
    /**
     * Render the progress bar to the console
     */
    render() {
      // Calculate percentage
      const percent = Math.floor((this.current / this.total) * 100);
      
      // Calculate the number of complete and incomplete characters
      const completeLength = Math.floor((this.current / this.total) * this.options.width);
      const incompleteLength = this.options.width - completeLength;
      
      // Build the progress bar
      const bar = this.options.complete.repeat(completeLength) + 
                  this.options.incomplete.repeat(incompleteLength);
  
      // Calculate ETA
      let etaText = '';
      if (this.current > 0 && this.current < this.total) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.current / elapsed;
        const eta = Math.round((this.total - this.current) / rate);
        
        if (eta < 60) {
          etaText = `ETA: ${eta}s`;
        } else if (eta < 3600) {
          etaText = `ETA: ${Math.floor(eta / 60)}m ${eta % 60}s`;
        } else {
          etaText = `ETA: ${Math.floor(eta / 3600)}h ${Math.floor((eta % 3600) / 60)}m`;
        }
      }
      
      let output = '';
      
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
      
      // Clear the line and write the output
      process.stdout.write('\r\x1b[K' + output);
      
      // If complete and clear option is true, add a newline
      if (this.current >= this.total && this.options.clear) {
        process.stdout.write('\n');
      }
    }
  
    /**
     * Completes the progress bar
     */
    complete() {
      this.increment(this.total - this.current);
    }
  }
  
  module.exports = CustomProgressBar;