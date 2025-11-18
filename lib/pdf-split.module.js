import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { FileCache } from '@chriscdn/file-cache';
import { pathExists } from 'path-exists';
import { Memoize } from '@chriscdn/memoize';
import sha1 from 'sha1';

const e="_default",t=e=>["string","number"].includes(typeof e),s=s=>{var r;return null!=(r=t(s)?s:s.key)?r:e};class r{constructor(e){this.queue=void 0,this.maxConcurrent=void 0,this.count=void 0,this.queue=[],this.maxConcurrent=e,this.count=0;}get canAcquire(){return this.count<this.maxConcurrent}incrementCount(){this.count++;}decrementCount(){this.count--;}acquire(e){return this.canAcquire?(this.incrementCount(),Promise.resolve()):new Promise(t=>{this.queue.push({resolve:t,priority:e}),this.queue.sort((e,t)=>t.priority-e.priority);})}release(){const e=this.queue.shift();e?setTimeout(e.resolve,0):this.decrementCount();}}class n{constructor(e=1){if(this.semaphoreInstances=void 0,this.maxConcurrent=void 0,this.semaphoreInstances={},this.maxConcurrent=e,e<1)throw new Error("The maxConcurrent must be 1 or greater.")}hasSemaphoreInstance(t=e){return Boolean(this.semaphoreInstances[t])}getSemaphoreInstance(t=e){return this.hasSemaphoreInstance(t)||(this.semaphoreInstances[t]=new r(this.maxConcurrent)),this.semaphoreInstances[t]}tidy(t=e){this.hasSemaphoreInstance(t)&&0===this.getSemaphoreInstance(t).count&&delete this.semaphoreInstances[t];}canAcquire(t=e){const r=s(t);return !this.hasSemaphoreInstance(r)||this.getSemaphoreInstance(r).canAcquire}acquire(r=e){const n=s(r),i=null!=(o=t(a=r)?0:a.priority)?o:0;var a,o;return this.getSemaphoreInstance(n).acquire(i)}release(t=e){const r=s(t);this.getSemaphoreInstance(r).release(),this.tidy(r);}count(t=e){const r=s(t);return this.hasSemaphoreInstance(r)?this.getSemaphoreInstance(r).count:0}hasTasks(t=e){return this.count(t)>0}async request(t,s=e){try{return await this.acquire(s),await t()}finally{this.release(s);}}async requestIfAvailable(t,s=e){return this.canAcquire(s)?this.request(t,s):null}}

const semaphore = new n();
const execPromise = promisify(exec);
var Rotate;
(function (Rotate) {
  Rotate[Rotate["DEG_0"] = 0] = "DEG_0";
  Rotate[Rotate["DEG_90"] = 90] = "DEG_90";
  Rotate[Rotate["DEG_180"] = 180] = "DEG_180";
  Rotate[Rotate["DEG_270"] = 270] = "DEG_270";
})(Rotate || (Rotate = {}));
const randomDirectoryName = (l = 16) => [...Array(l)].map(() => Math.random().toString(36)[2]).join("");
const quote = text => `"${text}"`;
class PDFSplitFileCache extends FileCache {
  constructor(args) {
    var _args$pdfcpu;
    // Make a standalone function that can be recursively called.
    const cb = async (filePath, {
      pdfFilePath,
      pageIndex,
      rotate
    }) => {
      const rotateResolved = rotate != null ? rotate : Rotate.DEG_0;
      if (rotateResolved === Rotate.DEG_0) {
        try {
          // The semaphore prevents multiple consecutive calls (with
          // different page numbers) from running the full extraction
          // again.
          await semaphore.acquire(pdfFilePath);
          if (await pathExists(filePath)) {
            // all done
          } else {
            // Create a _temp directory in the cache directory to
            // hold the temp files. This guarantees the temp files
            // are stored on the same volume, which removes problems
            // moving the files later.
            //
            // Orphaned files and empty directories are cleaned up
            // by FileCache.
            const _thumbnailPath = path.resolve(args.cachePath, "_temp", randomDirectoryName());
            await fs.mkdir(_thumbnailPath, {
              recursive: true
            });
            const command = [this.pdfcpu, "split", quote(pdfFilePath), quote(_thumbnailPath)];
            console.time("pdfcpu - split");
            await execPromise(command.join(" "));
            console.timeEnd("pdfcpu - split");
            const pdfFiles = await fs.readdir(_thumbnailPath);
            await Promise.all(pdfFiles.map(async pdfFile => {
              const match = pdfFile.match(/_(\d+)\.pdf$/);
              if (match != null && match[1]) {
                // The -1 makes this 0-based
                const _pageIndex = parseInt(match[1], 10) - 1;
                const sourceFilePath = path.join(_thumbnailPath, pdfFile);
                const targetFilePath = await this.resolveFilePath({
                  pdfFilePath,
                  pageIndex: _pageIndex
                });
                await fs.mkdir(path.dirname(targetFilePath), {
                  recursive: true
                });
                // these should always be on the same volume, making an fs.rename possible
                await fs.rename(sourceFilePath, targetFilePath);
              }
            }));
            // After all that, check if we have a file.
            if (await pathExists(filePath)) {
              // all good
            } else {
              throw new Error(`Invalid range or PDF: ${filePath}`);
            }
          }
        } finally {
          semaphore.release(pdfFilePath);
        }
      } else {
        const sourceFilePath = await this.resolveFilePath({
          pdfFilePath,
          pageIndex
        });
        await cb(sourceFilePath, {
          pdfFilePath,
          pageIndex,
          rotate: Rotate.DEG_0
        });
        const command = [this.pdfcpu, "rotate", quote(sourceFilePath), rotateResolved, filePath];
        console.time("pdfcpu - rotate");
        await execPromise(command.join(" "));
        console.timeEnd("pdfcpu - rotate");
      }
    };
    super({
      ...args,
      ext: () => ".pdf",
      resolveCacheKey: ({
        pdfFilePath,
        pageIndex,
        rotate
      }) => {
        return sha1(JSON.stringify({
          pdfFilePath,
          pageIndex,
          rotate: rotate != null ? rotate : Rotate.DEG_0
        }));
      },
      cb
    });
    this.pdfcpu = void 0;
    this.pdfcpu = (_args$pdfcpu = args.pdfcpu) != null ? _args$pdfcpu : "pdfcpu";
    this.pdfInfo = Memoize(this.pdfInfo.bind(this));
  }
  async pdfInfo(pdfFilePath) {
    const command = [this.pdfcpu, "info -json", quote(pdfFilePath)];
    const {
      stdout
    } = await execPromise(command.join(" "));
    const pdfCpuInfo = JSON.parse(stdout);
    return pdfCpuInfo.infos[0];
  }
  async pageCount(pdfFilePath) {
    const pdfInfo = await this.pdfInfo(pdfFilePath);
    return pdfInfo.pageCount;
  }
  async pages(pdfFilePath) {
    const pageCount = await this.pageCount(pdfFilePath);
    return await Promise.all(Array.from({
      length: pageCount
    }, (_, i) => this.getFile({
      pdfFilePath,
      pageIndex: i
    })));
  }
}

export { PDFSplitFileCache, Rotate };
//# sourceMappingURL=pdf-split.module.js.map
