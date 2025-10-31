# pdf-split

`pdf-split` is a package that splits a PDF into individual pages and caches the results on the file system. It relies on [pdfcpu](https://pdfcpu.io/) for the split operation and [@chriscdn/file-cache](https://github.com/chriscdn/file-cache) for automatic file caching, including cleanup.

## Installation

Using npm:

```bash
npm install @chriscdn/pdf-split
```

Using yarn:

```bash
yarn add @chriscdn/pdf-split
```

## Usage

Create a `PDFSplitFileCache` instance:

```ts
import { PDFSplitFileCache } from "../src/index";
import { Duration } from "@chriscdn/duration";

const splitCache = new PDFSplitFileCache({
  cachePath: "/path/to/cache/directory",
  ttl: Duration.toMilliseconds({ days: 7 }),
});
```

This assumes that [pdfcpu](https://pdfcpu.io/) is available on the system `PATH`. If it is not, you can provide the path to the binary by using the `pdfcpu` parameter in the constructor:

```ts
const splitCache = new PDFSplitFileCache({
  cachePath: "/path/to/cache/directory",
  ttl: Duration.toMilliseconds({ days: 7 }),
  pdfcpu: "/opt/homebrew/bin/pdfcpu",
});
```

The `PDFSplitFileCache` class extends `FileCache` from [@chriscdn/file-cache](https://github.com/chriscdn/file-cache). All constructor arguments from `FileCache` are supported except for `cb` and `ext`. The cache, including automatic cleanup of expired files, is managed by `FileCache`.

Retrieve the file path to a PDF page:

```ts
const firstPageFilePath = await splitCache.getFile({
  pdfFilePath: "/path/to/your/pdf/file.pdf",
  pageIndex: 0,
});
```

**Notes:**

- `pageIndex` is 0-based.
- The cache key is based on `pdfFilePath` and `pageIndex`. Ensure that unique PDFs have unique names to avoid cache collisions.

## License

[MIT](LICENSE)
