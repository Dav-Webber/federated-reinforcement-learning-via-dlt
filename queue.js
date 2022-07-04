

class Queue {
    constructor() {
      this.items = {};
      this.headIndex = 0;
      this.tailIndex = 0;
    }
    enqueue(item) {
      this.items[this.tailIndex] = item;
      this.tailIndex++;
    }
    dequeue() {
      const item = this.items[this.headIndex];
      delete this.items[this.headIndex];
      this.headIndex++;
      return item;
    }
    peek() {
      return this.items[this.headIndex];
    }
    get length() {
      return this.tailIndex - this.headIndex;
    }

    emptyQueue()
    {
      this.items = {};
      this.headIndex = 0;
      this.tailIndex = 0;
    }
    // testing purposes to show all items in the queue/list
    printAll()
    {
      for (let item in this.items)
      {
        
        let contents = Buffer.from(item.contents, "utf8").toString();
        console.log(contents);
      }
    }
  }

  module.exports = Queue // 👈 Export class