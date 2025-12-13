exports.single = (req, res, next) => {
  try{
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const rel = req.file.path.split('server')[1].replace(/\\/g, '/');
    const url = rel.startsWith('/') ? rel : '/' + rel;
    res.json({ file: { fileName: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size, url } });
  } catch(e){ next(e); }
};

exports.profile = (req, res, next) => {
  try{
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const rel = req.file.path.split('server')[1].replace(/\\/g, '/');
    const url = rel.startsWith('/') ? rel : '/' + rel;
    res.json({ file: { fileName: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size, url } });
  } catch(e){ next(e); }
};
