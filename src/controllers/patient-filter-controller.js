/**
 * Get all filter categories
 */
exports.getFilterCategories = async (req, res) => {
  try {
    // TODO: Replace with your actual database query
    // Example: const categories = await FilterCategoryModel.distinct('category');
    const categories = [
      "GENDER.M",
      "GENDER.F",
      "GENDER.U"
    ];

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching filter categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get patients by filter categories
 */
exports.getPatientsByCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        error: 'Missing required parameter: categories (must be an array)'
      });
    }

    // TODO: Replace with your actual database query
    // Example: const result = await PatientModel.aggregate([...]);
    const result = {};

    categories.forEach(category => {
      result[category] = [];
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching patients by categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};