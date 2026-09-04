const handler = async (req) => {
  try {
    return 'ok';
  } catch(e) {
    return 'err';
  }
};

export default handler;