const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("user.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);

const userService = grpcObject;

// Mock DB
const users = {
  1: { id: 1, name: "Sandesh" },
  2: { id: 2, name: "John" },
  3: { id: 3, name: "Alice" },
};

function getUser(call, callback) {
  const user = users[call.request.id] || { id: 0, name: "Unknown" };
  callback(null, user);
}

const server = new grpc.Server();

server.addService(userService.UserService.service, {
  GetUser: getUser,
});

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("User Service running on gRPC port 50051");
    server.start();
  },
);
