import path from "node:path";
import http, { IncomingMessage, ServerResponse } from "node:http";
import fs, { Stats } from "node:fs";
import arg from "arg";

type Rewrite = {
  source: string;
  destination: string;
};

type Redirect = Rewrite;

interface Config {
  entry?: string;
  rewrites?: Rewrite[];
  redirects?: Redirect[];
  etag?: boolean;
  cleanUrls?: boolean;
  trailingSlash?: boolean;
  symlink?: boolean;
}

const args = arg({
  "--port": Number,
  "-p": "--port",
});

async function processDirectory(
  absolutePath: string
): Promise<[fs.Stats | null, string]> {
  const newAbsolutePath = path.join(absolutePath, "index.html");

  try {
    const newStat = await fs.promises.lstat(newAbsolutePath);
    return [newStat, newAbsolutePath];
  } catch (e) {
    return [null, newAbsolutePath];
  }
}

// 响应 404，此处可做一个优化，比如读取文件系统中的 404.html 文件
function responseNotFound(res: ServerResponse) {
  res.statusCode = 404;
  res.end("NNNNNNot Found");
}

const handler = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: Config
) => {
  const pathname = new URL("http://localhost:3000" + req.url ?? "").pathname;

  let absolutePath = path.resolve(config.entry ?? "", path.join(".", pathname));
  let statusCode = 200;
  let stat: Stats | null = null;

  try {
    stat = await fs.promises.lstat(absolutePath);
  } catch (e) {}

  if (stat?.isDirectory()) {
    // 如果是目录，则去寻找目录中的 index.html
    [stat, absolutePath] = await processDirectory(absolutePath);
  }

  if (stat === null) {
    return responseNotFound(res);
  }

  let headers = {
    "Content-Length": stat.size,
  };

  res.writeHead(statusCode, headers);

  fs.createReadStream(absolutePath).pipe(res);
};

function startEndPoint(port: number, entry: string) {
  const server = http.createServer((req, res) => {
    handler(req, res, { entry });
  });

  server.listen(port, () => {
    console.log(`Open http://localhost:${port}`);
  });
}

startEndPoint(args["--port"] ?? 3000, args._[0]);
