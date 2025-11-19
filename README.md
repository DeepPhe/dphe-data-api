# DPHE Data API

A RESTful API for managing and accessing patient health data, including cancer information, demographics, documents, and clinical concepts.


- Node.js (v14 or higher)
- npm or yarn

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dphe-data-api
```

2. Install dependencies:
```bash
npm install
```


4. Configure your environment variables in `.env`

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your environment variables).

## 📚 API Documentation

Once the server is running, access the interactive Swagger documentation at:

```
http://localhost:3000/api-docs
```



## 🔌 Available Endpoints

### Patient Documents
- `GET /v1/dphe-data/patient/documents/` - Get all documents for a patient
- `GET /v1/dphe-data/patient/document/concepts` - Get concepts in a document
- `GET /v1/dphe-data/patient/document/mentions` - Get mentions in a document

### Patient Concepts
- `GET /v1/dphe-data/patient/concepts/` - Get all concepts for a patient
- `GET /v1/dphe-data/patient/conceptRelations/` - Get concept relations for a patient

### Cancer Data
- `GET /v1/dphe-data/patient/cancers` - Get all cancers for a patient
- `GET /v1/dphe-data/patient/cancer/attributes` - Get cancer attributes
- `GET /v1/dphe-data/patient/cancer/attribute/concepts` - Get cancer concepts
- `GET /v1/dphe-data/patient/cancer/attribute/mentions` - Get cancer mentions

### Demographics
- `GET /v1/dphe-data/patient/demographics` - Get patient demographics

### Cohort Filtering
- `GET /v1/dphe-data/cohort/filter/categories` - Get all filter categories
- `POST /v1/dphe-data/cohort/filter/categories/patients` - Get patients by categories

## 🛠 Development

### Generate Type Definitions
```bash
npm run generate-schemas
```

This command generates TypeScript type definitions from JSON schemas.

### Running with Nodemon
The `npm run dev` command uses nodemon for automatic server restarts on file changes.

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the server in production mode |
| `npm run dev` | Start the server in development mode with auto-reload |
| `npm run generate-schemas` | Generate TypeScript definitions from JSON schemas |



\
## 📞 Support

For issues and questions, please open an issue in the GitHub repository.

---
