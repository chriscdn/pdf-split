var util = require('util');
var child_process = require('child_process');
var path = require('path');
var fs = require('fs/promises');
var fileCache = require('@chriscdn/file-cache');
var pathExists = require('path-exists');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

const e="_default",t=e=>["string","number"].includes(typeof e),s=s=>{var n;return null!=(n=t(s)?s:s.key)?n:e};class n{constructor(e){this.queue=void 0,this.maxConcurrent=void 0,this.count=void 0,this.queue=[],this.maxConcurrent=e,this.count=0;}get canAcquire(){return this.count<this.maxConcurrent}incrementCount(){this.count++;}decrementCount(){this.count--;}acquire(e){return this.canAcquire?(this.incrementCount(),Promise.resolve()):new Promise(t=>{this.queue.push({resolve:t,priority:e}),this.queue.sort((e,t)=>t.priority-e.priority);})}release(){const e=this.queue.shift();e?setTimeout(e.resolve,0):this.decrementCount();}}class r{constructor(e=1){this.semaphoreInstances=void 0,this.maxConcurrent=void 0,this.semaphoreInstances={},this.maxConcurrent=e;}hasSemaphoreInstance(t=e){return Boolean(this.semaphoreInstances[t])}getSemaphoreInstance(t=e){return this.hasSemaphoreInstance(t)||(this.semaphoreInstances[t]=new n(this.maxConcurrent)),this.semaphoreInstances[t]}tidy(t=e){this.hasSemaphoreInstance(t)&&0===this.getSemaphoreInstance(t).count&&delete this.semaphoreInstances[t];}canAcquire(t=e){const n=s(t);return !this.hasSemaphoreInstance(n)||this.getSemaphoreInstance(n).canAcquire}acquire(n=e){const r=s(n),i=null!=(o=t(a=n)?0:a.priority)?o:0;var a,o;return this.getSemaphoreInstance(r).acquire(i)}release(t=e){const n=s(t);this.getSemaphoreInstance(n).release(),this.tidy(n);}count(t=e){const n=s(t);return this.hasSemaphoreInstance(n)?this.getSemaphoreInstance(n).count:0}hasTasks(t=e){return this.count(t)>0}async request(t,s=e){try{return await this.acquire(s),await t()}finally{this.release(s);}}async requestIfAvailable(t,s=e){return this.canAcquire(s)?this.request(t,s):null}}

const semaphore = new r();
const execPromise = util.promisify(child_process.exec);
const randomDirectoryName = (l = 16) => [...Array(l)].map(() => Math.random().toString(36)[2]).join("");
class PDFSplitFileCache extends fileCache.FileCache {
  constructor(args) {
    super({
      ...args,
      ext: () => ".pdf",
      cb: async (filePath, {
        pdfFilePath,
        pageIndex
      }) => {
        try {
          // The semaphore prevents multiple consecutive calls (with
          // different page numbers) from running the full extraction
          // again.
          await semaphore.acquire(pdfFilePath);
          if (await pathExists.pathExists(filePath)) {
            // all done
          } else {
            var _args$pdfcpu;
            // Create a _temp directory in the cache directory to
            // hold the temp files. This guarantees the temp files
            // are stored on the same volume, which removes problems
            // moving the files later.
            //
            // Orphaned files and empty directories are cleaned up
            // by FileCache.
            const _thumbnailPath = path__default["default"].resolve(args.cachePath, "_temp", randomDirectoryName());
            await fs__default["default"].mkdir(_thumbnailPath, {
              recursive: true
            });
            const command = [(_args$pdfcpu = args.pdfcpu) != null ? _args$pdfcpu : "pdfcpu", "split", pdfFilePath, _thumbnailPath];
            console.time("pdfcpu - split");
            await execPromise(command.join(" "));
            console.timeEnd("pdfcpu - split");
            const pdfFiles = await fs__default["default"].readdir(_thumbnailPath);
            await Promise.all(pdfFiles.map(async pdfFile => {
              const match = pdfFile.match(/_(\d+)\.pdf$/);
              if (match) {
                // The -1 makes this 0-based
                const _pageIndex = parseInt(match[1], 10) - 1;
                const sourceFilePath = path__default["default"].join(_thumbnailPath, pdfFile);
                const targetFilePath = await this.resolveFilePath({
                  pdfFilePath,
                  pageIndex: _pageIndex
                });
                await fs__default["default"].mkdir(path__default["default"].dirname(targetFilePath), {
                  recursive: true
                });
                // these should always be on the same volume, making an fs.rename possible
                await fs__default["default"].rename(sourceFilePath, targetFilePath);
              }
            }));
            // After all that, check if we have a file.
            if (await pathExists.pathExists(filePath)) {
              // all good
            } else {
              throw new Error(`Invalid range or PDF: ${pageIndex}`);
            }
          }
        } finally {
          semaphore.release(pdfFilePath);
        }
      }
    });
  }
}

exports.PDFSplitFileCache = PDFSplitFileCache;
//# sourceMappingURL=pdf-split.cjs.map
