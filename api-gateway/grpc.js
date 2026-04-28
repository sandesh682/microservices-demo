const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("user.proto", {});
const grpcObject = grpc.loadPackageDefinition(packageDef);

// ✅ NO package → directly access UserService
const client = new grpcObject.UserService(
  "localhost:50051",
  grpc.credentials.createInsecure(),
);

module.exports = client;
