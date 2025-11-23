// Dev seed removed: this module used to provide a development-only seed endpoint.
// The route has been unregistered for deployment; keep a harmless stub here
// so accidental imports won't break the server. The handler responds 410 Gone.

export const seedDemoData = async (_req: any, res: any) => {
  return res.status(410).json({ success: false, error: 'dev seed removed' });
};

export default seedDemoData;
