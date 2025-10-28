module.exports = {
  schemas: {
  "AttributeValue": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "conceptIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "confidence": {
        "type": "integer"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "negated": {
        "type": "boolean"
      },
      "uncertain": {
        "type": "boolean"
      },
      "value": {
        "type": "string"
      }
    }
  },
  "AttributeXn": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "values": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "classUri": {
              "type": "string"
            },
            "conceptIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "confidence": {
              "type": "integer"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "negated": {
              "type": "boolean"
            },
            "uncertain": {
              "type": "boolean"
            },
            "value": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "BasicPatient": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object"
  },
  "BiomarkerSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "patientId": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      },
      "tumorFactRelation": {
        "type": "string"
      },
      "valueText": {
        "type": "string"
      }
    }
  },
  "Cancer": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmAttribute"
        }
      },
      "classUri": {
        "type": "string"
      },
      "factIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "id": {
        "type": "string"
      },
      "relatedFactIds": {
        "$ref": "#/components/schemas/Map(String,List(String))"
      },
      "tumors": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attributes": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/NeoplasmAttribute"
              }
            },
            "classUri": {
              "type": "string"
            },
            "factIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "id": {
              "type": "string"
            },
            "relatedFactIds": {
              "$ref": "#/components/schemas/Map(String,List(String))"
            }
          }
        }
      }
    }
  },
  "Map(String,List(String))": {
    "type": "object"
  },
  "Mention": {
    "type": "object",
    "properties": {
      "begin": {
        "type": "integer"
      },
      "classUri": {
        "type": "string"
      },
      "confidence": {
        "type": "integer"
      },
      "end": {
        "type": "integer"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "negated": {
        "type": "boolean"
      },
      "uncertain": {
        "type": "boolean"
      }
    }
  },
  "NeoplasmAttribute": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "confidence": {
        "type": "integer"
      },
      "confidenceFeatures": {
        "type": "array",
        "items": {
          "type": "integer"
        }
      },
      "directEvidence": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Mention"
        }
      },
      "id": {
        "type": "string"
      },
      "indirectEvidence": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Mention"
        }
      },
      "name": {
        "type": "string"
      },
      "notEvidence": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Mention"
        }
      },
      "value": {
        "type": "string"
      }
    }
  },
  "CancerAndTumorSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "cancers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attributes": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/NeoplasmAttribute"
              }
            },
            "classUri": {
              "type": "string"
            },
            "er": {
              "type": "string"
            },
            "her2": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "pathologic_m": {
              "type": "string"
            },
            "pathologic_n": {
              "type": "string"
            },
            "pathologic_t": {
              "type": "string"
            },
            "pr": {
              "type": "string"
            },
            "subSummaries": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/NeoplasmSummary"
              }
            },
            "tumors": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/NeoplasmSummary"
              }
            }
          }
        }
      }
    }
  },
  "NeoplasmSummary": {
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "classUri": {
              "type": "string"
            },
            "confidence": {
              "type": "integer"
            },
            "confidenceFeatures": {
              "type": "array",
              "items": {
                "type": "integer"
              }
            },
            "directEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "id": {
              "type": "string"
            },
            "indirectEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "name": {
              "type": "string"
            },
            "notEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "value": {
              "type": "string"
            }
          }
        }
      },
      "classUri": {
        "type": "string"
      },
      "er": {
        "type": "string"
      },
      "her2": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "pathologic_m": {
        "type": "string"
      },
      "pathologic_n": {
        "type": "string"
      },
      "pathologic_t": {
        "type": "string"
      },
      "pr": {
        "type": "string"
      },
      "subSummaries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmSummary"
        }
      }
    }
  },
  "CancerFact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "cancerFactInfo": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "prettyName": {
            "type": "string"
          }
        }
      },
      "relation": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      }
    }
  },
  "CancerSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmAttribute"
        }
      },
      "classUri": {
        "type": "string"
      },
      "er": {
        "type": "string"
      },
      "her2": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "pathologic_m": {
        "type": "string"
      },
      "pathologic_n": {
        "type": "string"
      },
      "pathologic_t": {
        "type": "string"
      },
      "pr": {
        "type": "string"
      },
      "subSummaries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmSummary"
        }
      },
      "tumors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmSummary"
        }
      }
    }
  },
  "CancerSummaryXn": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AttributeXn"
        }
      },
      "classUri": {
        "type": "string"
      },
      "conceptIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "confidence": {
        "type": "integer"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "negated": {
        "type": "boolean"
      },
      "tumors": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attributes": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/AttributeXn"
              }
            },
            "classUri": {
              "type": "string"
            },
            "conceptIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "confidence": {
              "type": "integer"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "negated": {
              "type": "boolean"
            },
            "uncertain": {
              "type": "boolean"
            }
          }
        }
      },
      "uncertain": {
        "type": "boolean"
      }
    }
  },
  "Codification": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "codes": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "source": {
        "type": "string"
      }
    }
  },
  "Concept": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "codifications": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "codes": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "source": {
              "type": "string"
            }
          }
        }
      },
      "confidence": {
        "type": "integer"
      },
      "dpheGroup": {
        "type": "string"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "mentionIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "negated": {
        "type": "boolean"
      },
      "preferredText": {
        "type": "string"
      },
      "uncertain": {
        "type": "boolean"
      }
    }
  },
  "ConceptRelation": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "sourceId": {
        "type": "string"
      },
      "targetId": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "ConfidenceOwner": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object"
  },
  "DocumentXn": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "date": {
        "type": "string"
      },
      "episode": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "mentionRelations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "sourceId": {
              "type": "string"
            },
            "targetId": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "mentions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "begin": {
              "type": "integer"
            },
            "classUri": {
              "type": "string"
            },
            "confidence": {
              "type": "integer"
            },
            "end": {
              "type": "integer"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "negated": {
              "type": "boolean"
            },
            "uncertain": {
              "type": "boolean"
            }
          }
        }
      },
      "name": {
        "type": "string"
      },
      "sections": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "begin": {
              "type": "integer"
            },
            "end": {
              "type": "integer"
            },
            "id": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "text": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "Episode": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "endDate": {
        "type": "string"
      },
      "startDate": {
        "type": "string"
      }
    }
  },
  "Fact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "confidence": {
        "type": "integer"
      },
      "confidenceFeatures": {
        "type": "array",
        "items": {
          "type": "integer"
        }
      },
      "directEvidenceIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "relatedFactIds": {
        "type": "object"
      },
      "value": {
        "type": "string"
      }
    }
  },
  "FactInfo": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "prettyName": {
        "type": "string"
      }
    }
  },
  "FactInfoAndGroupedTextProvenances": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "mentionedTerms": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "begin": {
              "type": "integer"
            },
            "end": {
              "type": "integer"
            },
            "reportId": {
              "type": "string"
            },
            "reportName": {
              "type": "string"
            },
            "reportType": {
              "type": "string"
            },
            "term": {
              "type": "string"
            }
          }
        }
      },
      "sourceFact": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "prettyName": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        }
      }
    }
  },
  "FullPatient": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "birth": {
        "type": "string"
      },
      "death": {
        "type": "string"
      },
      "firstEncounter": {
        "type": "string"
      },
      "gender": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "lastEncounter": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "notes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "corefs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "idChain": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "mentions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "classUri": {
                    "type": "string"
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  }
                }
              }
            },
            "name": {
              "type": "string"
            },
            "relations": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "sourceId": {
                    "type": "string"
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "id": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "text": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "GuiPatientSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "patientInfo": {
        "type": "object",
        "properties": {
          "birthDate": {
            "type": "string"
          },
          "firstEncounterAge": {
            "type": "string"
          },
          "firstEncounterDate": {
            "type": "string"
          },
          "gender": {
            "type": "string"
          },
          "lastEncounterAge": {
            "type": "string"
          },
          "lastEncounterDate": {
            "type": "string"
          },
          "patientId": {
            "type": "string"
          },
          "patientName": {
            "type": "string"
          }
        }
      },
      "reportData": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "reportName": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "InfoNode": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "confidence": {
        "type": "integer"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "negated": {
        "type": "boolean"
      },
      "uncertain": {
        "type": "boolean"
      }
    }
  },
  "MentionCoref": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "idChain": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  },
  "MentionRelation": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "sourceId": {
        "type": "string"
      },
      "targetId": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "MentionedTerm": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "begin": {
        "type": "integer"
      },
      "end": {
        "type": "integer"
      },
      "reportId": {
        "type": "string"
      },
      "reportName": {
        "type": "string"
      },
      "reportType": {
        "type": "string"
      },
      "term": {
        "type": "string"
      }
    }
  },
  "NewBiomarkerSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "patientId": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      },
      "tumorFactRelation": {
        "type": "string"
      },
      "valueText": {
        "type": "string"
      }
    }
  },
  "NewCancerAndTumorSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "cancers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "cancerFacts": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "cancerFactInfo": {
                    "$ref": "#/components/schemas/NewFactInfo"
                  },
                  "relation": {
                    "type": "string"
                  },
                  "relationPrettyName": {
                    "type": "string"
                  }
                }
              }
            },
            "cancerId": {
              "type": "string"
            },
            "tumors": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "hasTumorType": {
                    "type": "string"
                  },
                  "tumorFacts": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "relation": {
                          "type": "string"
                        },
                        "relationPrettyName": {
                          "type": "string"
                        },
                        "tumorFactInfo": {
                          "$ref": "#/components/schemas/NewFactInfo"
                        }
                      }
                    }
                  },
                  "tumorId": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "NewFactInfo": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "prettyName": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    }
  },
  "NewCancerFact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "cancerFactInfo": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "prettyName": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        }
      },
      "relation": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      }
    }
  },
  "NewCancerSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "cancerFacts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "cancerFactInfo": {
              "$ref": "#/components/schemas/NewFactInfo"
            },
            "relation": {
              "type": "string"
            },
            "relationPrettyName": {
              "type": "string"
            }
          }
        }
      },
      "cancerId": {
        "type": "string"
      },
      "tumors": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "hasTumorType": {
              "type": "string"
            },
            "tumorFacts": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "relation": {
                    "type": "string"
                  },
                  "relationPrettyName": {
                    "type": "string"
                  },
                  "tumorFactInfo": {
                    "$ref": "#/components/schemas/NewFactInfo"
                  }
                }
              }
            },
            "tumorId": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "NewFact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "relation": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      }
    }
  },
  "NewMentionedTerm": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "begin": {
        "type": "integer"
      },
      "end": {
        "type": "integer"
      },
      "reportId": {
        "type": "string"
      },
      "reportName": {
        "type": "string"
      },
      "reportType": {
        "type": "string"
      },
      "term": {
        "type": "string"
      }
    }
  },
  "NewPatientDiagnosis": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "diagnosis": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "diagnosisGroups": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "patientId": {
        "type": "string"
      }
    }
  },
  "NewPatientSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "patientInfo": {
        "type": "object",
        "properties": {
          "birthDate": {
            "type": "string"
          },
          "firstEncounterAge": {
            "type": "string"
          },
          "firstEncounterDate": {
            "type": "string"
          },
          "gender": {
            "type": "string"
          },
          "lastEncounterAge": {
            "type": "string"
          },
          "lastEncounterDate": {
            "type": "string"
          },
          "patientId": {
            "type": "string"
          },
          "patientName": {
            "type": "string"
          }
        }
      },
      "reportData": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "reportName": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "NewReport": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "date": {
        "type": "string"
      },
      "episode": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "reportName": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "NewStructuredPatientData": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "birthdate": {
        "type": "string"
      },
      "firstEncounterDate": {
        "type": "string"
      },
      "firstname": {
        "type": "string"
      },
      "gender": {
        "type": "string"
      },
      "lastEncounterDate": {
        "type": "string"
      },
      "lastname": {
        "type": "string"
      },
      "patientId": {
        "type": "string"
      }
    }
  },
  "NewTumorFact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "relation": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      },
      "tumorFactInfo": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "prettyName": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        }
      }
    }
  },
  "NewTumorSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "hasTumorType": {
        "type": "string"
      },
      "tumorFacts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "relation": {
              "type": "string"
            },
            "relationPrettyName": {
              "type": "string"
            },
            "tumorFactInfo": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "prettyName": {
                  "type": "string"
                },
                "value": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "tumorId": {
        "type": "string"
      }
    }
  },
  "Note": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "corefs": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "idChain": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      },
      "date": {
        "type": "string"
      },
      "episode": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "mentions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "begin": {
              "type": "integer"
            },
            "classUri": {
              "type": "string"
            },
            "confidence": {
              "type": "integer"
            },
            "end": {
              "type": "integer"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "negated": {
              "type": "boolean"
            },
            "uncertain": {
              "type": "boolean"
            }
          }
        }
      },
      "name": {
        "type": "string"
      },
      "relations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "sourceId": {
              "type": "string"
            },
            "targetId": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "sections": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "begin": {
              "type": "integer"
            },
            "end": {
              "type": "integer"
            },
            "id": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "text": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "Patient": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "biomarkers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "patientId": {
              "type": "string"
            },
            "relationPrettyName": {
              "type": "string"
            },
            "tumorFactRelation": {
              "type": "string"
            },
            "valueText": {
              "type": "string"
            }
          }
        }
      },
      "birth": {
        "type": "string"
      },
      "death": {
        "type": "string"
      },
      "diagnoses": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "diagnosis": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "diagnosisGroups": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "patientId": {
              "type": "string"
            }
          }
        }
      },
      "gender": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "noteHash": {
        "type": "string"
      },
      "notes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "corefs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "idChain": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "mentions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "classUri": {
                    "type": "string"
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  }
                }
              }
            },
            "name": {
              "type": "string"
            },
            "relations": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "sourceId": {
                    "type": "string"
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "id": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "text": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "PatientDiagnosis": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "classUri": {
        "type": "string"
      },
      "patientId": {
        "type": "string"
      }
    }
  },
  "PatientInfo": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "birthDate": {
        "type": "string"
      },
      "firstEncounterAge": {
        "type": "string"
      },
      "firstEncounterDate": {
        "type": "string"
      },
      "gender": {
        "type": "string"
      },
      "lastEncounterAge": {
        "type": "string"
      },
      "lastEncounterDate": {
        "type": "string"
      },
      "patientId": {
        "type": "string"
      },
      "patientName": {
        "type": "string"
      }
    }
  },
  "PatientInfoAndStages": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "birthDate": {
        "type": "string"
      },
      "firstEncounterAge": {
        "type": "string"
      },
      "firstEncounterDate": {
        "type": "string"
      },
      "gender": {
        "type": "string"
      },
      "lastEncounterAge": {
        "type": "string"
      },
      "lastEncounterDate": {
        "type": "string"
      },
      "patientId": {
        "type": "string"
      },
      "patientName": {
        "type": "string"
      },
      "stages": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  },
  "PatientSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      },
      "neoplasms": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NeoplasmSummary"
        }
      },
      "patient": {
        "type": "object",
        "properties": {
          "biomarkers": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "patientId": {
                  "type": "string"
                },
                "relationPrettyName": {
                  "type": "string"
                },
                "tumorFactRelation": {
                  "type": "string"
                },
                "valueText": {
                  "type": "string"
                }
              }
            }
          },
          "birth": {
            "type": "string"
          },
          "death": {
            "type": "string"
          },
          "diagnoses": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "diagnosis": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "diagnosisGroups": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "patientId": {
                  "type": "string"
                }
              }
            }
          },
          "gender": {
            "type": "string"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "noteHash": {
            "type": "string"
          },
          "notes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "corefs": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "idChain": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "date": {
                  "type": "string"
                },
                "episode": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "mentions": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Mention"
                  }
                },
                "name": {
                  "type": "string"
                },
                "relations": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "sourceId": {
                        "type": "string"
                      },
                      "targetId": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string"
                      }
                    }
                  }
                },
                "sections": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "begin": {
                        "type": "integer"
                      },
                      "end": {
                        "type": "integer"
                      },
                      "id": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string"
                      }
                    }
                  }
                },
                "text": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  },
  "PatientSummaryAndStagesList": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "patientSummaryAndStages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "birthDate": {
              "type": "string"
            },
            "firstEncounterAge": {
              "type": "string"
            },
            "firstEncounterDate": {
              "type": "string"
            },
            "gender": {
              "type": "string"
            },
            "lastEncounterAge": {
              "type": "string"
            },
            "lastEncounterDate": {
              "type": "string"
            },
            "patientId": {
              "type": "string"
            },
            "patientName": {
              "type": "string"
            },
            "stages": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  },
  "PatientSummaryXn": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "birth": {
        "type": "string"
      },
      "cancers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attributes": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/AttributeXn"
              }
            },
            "classUri": {
              "type": "string"
            },
            "conceptIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "confidence": {
              "type": "integer"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "negated": {
              "type": "boolean"
            },
            "tumors": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "attributes": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/AttributeXn"
                    }
                  },
                  "classUri": {
                    "type": "string"
                  },
                  "conceptIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  }
                }
              }
            },
            "uncertain": {
              "type": "boolean"
            }
          }
        }
      },
      "conceptRelations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "sourceId": {
              "type": "string"
            },
            "targetId": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "concepts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "classUri": {
              "type": "string"
            },
            "codifications": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "codes": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "source": {
                    "type": "string"
                  }
                }
              }
            },
            "confidence": {
              "type": "integer"
            },
            "dpheGroup": {
              "type": "string"
            },
            "historic": {
              "type": "boolean"
            },
            "id": {
              "type": "string"
            },
            "mentionIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "negated": {
              "type": "boolean"
            },
            "preferredText": {
              "type": "string"
            },
            "uncertain": {
              "type": "boolean"
            }
          }
        }
      },
      "death": {
        "type": "string"
      },
      "documents": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "mentionRelations": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "sourceId": {
                    "type": "string"
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "mentions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "classUri": {
                    "type": "string"
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  }
                }
              }
            },
            "name": {
              "type": "string"
            },
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "id": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "text": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "gender": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      }
    }
  },
  "PatientXn": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "biomarkers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "patientId": {
              "type": "string"
            },
            "relationPrettyName": {
              "type": "string"
            },
            "tumorFactRelation": {
              "type": "string"
            },
            "valueText": {
              "type": "string"
            }
          }
        }
      },
      "birth": {
        "type": "string"
      },
      "death": {
        "type": "string"
      },
      "diagnoses": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "diagnosis": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "diagnosisGroups": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "patientId": {
              "type": "string"
            }
          }
        }
      },
      "gender": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "noteHash": {
        "type": "string"
      },
      "notes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "corefs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "idChain": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "date": {
              "type": "string"
            },
            "episode": {
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "mentions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "classUri": {
                    "type": "string"
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  }
                }
              }
            },
            "name": {
              "type": "string"
            },
            "relations": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "sourceId": {
                    "type": "string"
                  },
                  "targetId": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "begin": {
                    "type": "integer"
                  },
                  "end": {
                    "type": "integer"
                  },
                  "id": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  }
                }
              }
            },
            "text": {
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          }
        }
      }
    }
  },
  "Report": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "reportDate": {
        "type": "string"
      },
      "reportEpisode": {
        "type": "string"
      },
      "reportId": {
        "type": "string"
      },
      "reportType": {
        "type": "string"
      }
    }
  },
  "Section": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "begin": {
        "type": "integer"
      },
      "end": {
        "type": "integer"
      },
      "id": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  },
  "SharedPatientProperties": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object"
  },
  "Text": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    }
  },
  "Tumor": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "classUri": {
              "type": "string"
            },
            "confidence": {
              "type": "integer"
            },
            "confidenceFeatures": {
              "type": "array",
              "items": {
                "type": "integer"
              }
            },
            "directEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "id": {
              "type": "string"
            },
            "indirectEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "name": {
              "type": "string"
            },
            "notEvidence": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Mention"
              }
            },
            "value": {
              "type": "string"
            }
          }
        }
      },
      "classUri": {
        "type": "string"
      },
      "factIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "id": {
        "type": "string"
      },
      "relatedFactIds": {
        "type": "object"
      }
    }
  },
  "TumorFact": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "relation": {
        "type": "string"
      },
      "relationPrettyName": {
        "type": "string"
      },
      "tumorFactInfo": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "prettyName": {
            "type": "string"
          }
        }
      }
    }
  },
  "TumorSummary": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "hasTumorType": {
        "type": "string"
      },
      "tumorFacts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "relation": {
              "type": "string"
            },
            "relationPrettyName": {
              "type": "string"
            },
            "tumorFactInfo": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "prettyName": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "tumorId": {
        "type": "string"
      }
    }
  },
  "TumorSummaryXn": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attributes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "values": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "classUri": {
                    "type": "string"
                  },
                  "conceptIds": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "confidence": {
                    "type": "integer"
                  },
                  "historic": {
                    "type": "boolean"
                  },
                  "id": {
                    "type": "string"
                  },
                  "negated": {
                    "type": "boolean"
                  },
                  "uncertain": {
                    "type": "boolean"
                  },
                  "value": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      },
      "classUri": {
        "type": "string"
      },
      "conceptIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "confidence": {
        "type": "integer"
      },
      "historic": {
        "type": "boolean"
      },
      "id": {
        "type": "string"
      },
      "negated": {
        "type": "boolean"
      },
      "uncertain": {
        "type": "boolean"
      }
    }
  }
}
};
