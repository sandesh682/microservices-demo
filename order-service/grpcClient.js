const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("user.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);

const client = new grpcObject.UserService(
  "localhost:50051",
  grpc.credentials.createInsecure(),
);

console.log("gRPC client initialized");

function getUser(userId) {
  return new Promise((resolve, reject) => {
    client.GetUser({ id: userId }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = { getUser };
