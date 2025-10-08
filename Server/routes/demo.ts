import { RequestHandler } from "express";
// Define DemoResponse locally if the module does not exist
type DemoResponse = {
  message: string;
};

export const handleDemo: RequestHandler = (req, res) => {
  const response: DemoResponse = {
    message: "Hello from Express server",
  };
  res.status(200).json(response);
};
