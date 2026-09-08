// js/productos-polar.js
// Catálogo completo de productos Polar (versión 1.0)
const PRODUCTOS_POLAR = {
  categorias: [
    {
      nombre: "Cerveza",
      marcas: [
        {
          nombre: "Polar Pilsen",
          productos: [
            { codigo: "F01001", nombre: "Polar Pilsen", presentacion: "RET 222MLX6UN" },
            { codigo: "F01002", nombre: "Polar Pilsen", presentacion: "RET 330MLX24UN" },
            {"codigo": "F01003", "nombre": "Polar Pilsen", "presentacion": "LAT 250MLX24UN"},
            {"codigo": "F01006", "nombre": "Polar Pilsen", "presentacion": "RET 222MLX36UN PL (E)"},
            {"codigo": "F01007", "nombre": "Polar Pilsen", "presentacion": "RET 330MLX24UN PL (E)"},
            {"codigo": "F01024", "nombre": "Polar Pilsen", "presentacion": "RET 222MLX36UN ZF (E)"},
            {"codigo": "F01025", "nombre": "Polar Pilsen", "presentacion": "RET 330MLX24UN ZF (E)"},
            {"codigo": "F01063", "nombre": "Polar Pilsen", "presentacion": "NR 355MLX12UN"},
            {"codigo": "F01078", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN PL (E)"},
            {"codigo": "F01085", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN PL (E)"},
            {"codigo": "F01079", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN ZF (E)"},
            {"codigo": "F01086", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN ZF (E)"},
            {"codigo": "F01080", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX12UN SE (E)"},
            {"codigo": "F01087", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN SE (E)"},
            {"codigo": "F01083", "nombre": "Polar Pilsen", "presentacion": "LAT SLEEK 355MLX24UN"}
          ]
        },
        {
          "nombre": "Polar Light",
          "productos": [
            {"codigo": "F04005", "nombre": "Polar Light", "presentacion": "RET 222MLX6UN"},
            {"codigo": "F04006", "nombre": "Polar Light", "presentacion": "RET 222MLX24UN PL (E)"},
            {"codigo": "F04062", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX24UN PL (E)"},
            {"codigo": "F04009", "nombre": "Polar Light", "presentacion": "RET 222MLX24UN ZF (E)"},
            {"codigo": "F04043", "nombre": "Polar Light", "presentacion": "NR 355MLX12UN"},
            {"codigo": "F04014", "nombre": "Polar Light", "presentacion": "LAT 250MLX24UN"},
            {"codigo": "F04056", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX12UN"},
            {"codigo": "F04061", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX24UN"},
            {"codigo": "F04057", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX12UN PL (E)"},
            {"codigo": "F04058", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX12UN ZF (E)"},
            {"codigo": "F04063", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX24UN ZF (E)"},
            {"codigo": "F04059", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX12UN SE (E)"},
            {"codigo": "F04064", "nombre": "Polar Light", "presentacion": "Lat Sleek 355MLX24UN SE (E)"},
            {"codigo": "F04015", "nombre": "Polar Light", "presentacion": "LAT 250MLX24UN PL (E)"},
            {"codigo": "F04016", "nombre": "Polar Light", "presentacion": "LAT 250MLX24UN ZF (E)"},
            {"codigo": "F04065", "nombre": "Polar Light", "presentacion": "LAT 250MLX24UN SE (E)"}
          ]
        },
        {
          "nombre": "Solera",
          "productos": [
            {"codigo": "F03030", "nombre": "Solera", "presentacion": "RET 222MLX6UN"},
            {"codigo": "F03031", "nombre": "Solera", "presentacion": "RET 222MLX6UN PL (E)"},
            {"codigo": "F03076", "nombre": "Solera", "presentacion": "NR 222MLX12UN"},
            {"codigo": "F03063", "nombre": "Solera", "presentacion": "LAT 250MLX12UN"},
            {"codigo": "F03075", "nombre": "Solera", "presentacion": "NR 0.75L X 6 UN"},
            {"codigo": "F03078", "nombre": "Solera", "presentacion": "NR 222MLX12UN PL (E)"},
            {"codigo": "F03014", "nombre": "Solera Light", "presentacion": "RET 222MLX6UN"},
            {"codigo": "F03064", "nombre": "Solera Light", "presentacion": "LAT 250MLX12UN"},
            {"codigo": "F03015", "nombre": "Solera Light", "presentacion": "RET 222MLX6UN PL (E)"},
            {"codigo": "F03077", "nombre": "Solera Light", "presentacion": "NR 222MLX12UN"},
            {"codigo": "F03079", "nombre": "Solera Light", "presentacion": "NR 222MLX12UN PL (E)"},
            {"codigo": "F06067", "nombre": "Solera Kolsch", "presentacion": "LAT 250MLX12UN"}
          ]
        }
      ]
    },
    {
      "nombre": "Maltín",
      "marcas": [
        {
          "nombre": "Maltín Polar",
          "productos": [
            {"codigo": "F07001", "nombre": "Maltín Polar", "presentacion": "RET 222MLX6UN"},
            {"codigo": "F07018", "nombre": "Maltín Polar", "presentacion": "PET 1.5L X 6 UN"},
            {"codigo": "F07101", "nombre": "Maltín Polar", "presentacion": "LAT 355MLX24UN"},
            {"codigo": "F07007", "nombre": "Maltín Polar", "presentacion": "LAT 250MLX24UN"},
            {"codigo": "F07027", "nombre": "Maltín Polar", "presentacion": "LAT 250MLX24UN PL/ZF (E)"},
            {"codigo": "F07091", "nombre": "Maltín Polar", "presentacion": "NR 250MLX12UN PL/ZF (E)"},
            {"codigo": "F07014", "nombre": "Maltín Polar", "presentacion": "RET 222MLX36UN PL/ZF (E)"},
            {"codigo": "F07024", "nombre": "Maltín Polar", "presentacion": "PET 1.5L X6UN PL/ZF (E)"},
            {"codigo": "F07088", "nombre": "Maltín Polar", "presentacion": "NR 250MLX12UN"},
            {"codigo": "F07102", "nombre": "Maltín Polar", "presentacion": "LAT Sleek 355MLX24UN PL/ZF (E)"},
            {"codigo": "F07089", "nombre": "Maltín Light", "presentacion": "NR 250MLX12UN"}
          ]
        }
      ]
    },
    {
      "nombre": "Sangría",
      "marcas": [
        {
          "nombre": "Caroreña",
          "productos": [
            {"codigo": "FR0103", "nombre": "Caroreña Sangre Tinta", "presentacion": "1,75LX6UN"},
            {"codigo": "FR0104", "nombre": "Caroreña Sangre Tinta", "presentacion": "1,75LX6UN PL (E)"},
            {"codigo": "FR0114", "nombre": "Caroreña Sangre Tinta", "presentacion": "1,75LX6UN ZF (E)"},
            {"codigo": "FR0130", "nombre": "Caroreña Sangre Tinta", "presentacion": "1,75LX6UN SE (E)"},
            {"codigo": "FR0120", "nombre": "Caroreña Sangre Blanca", "presentacion": "1,75LX6UN"},
            {"codigo": "FR0121", "nombre": "Caroreña Sangre Blanca", "presentacion": "1,75LX6UN PL (E)"},
            {"codigo": "FR0122", "nombre": "Caroreña Sangre Blanca", "presentacion": "1,75LX6UN ZF (E)"},
            {"codigo": "FR0131", "nombre": "Caroreña Sangre Blanca", "presentacion": "1,75LX6UN SE (E)"},
            {"codigo": "FR0123", "nombre": "Caroreña Sangre Rosada", "presentacion": "1,75LX6UN"},
            {"codigo": "FR0124", "nombre": "Caroreña Sangre Rosada", "presentacion": "1,75LX6UN PL (E)"},
            {"codigo": "FR0125", "nombre": "Caroreña Sangre Rosada", "presentacion": "1,75LX6UN ZF (E)"},
            {"codigo": "FR0132", "nombre": "Caroreña Sangre Rosada", "presentacion": "1,75LX6UN SE (E)"},
            {"codigo": "FR0133", "nombre": "Caroreña Vera", "presentacion": "RET 222MLX6UN"},
            {"codigo": "FR0137", "nombre": "Caroreña Vera", "presentacion": "LAT 250MLX12UN"},
            {"codigo": "FR0153", "nombre": "Caroreña Vera Blanca", "presentacion": "LAT 250MLX12UN"},
            {"codigo": "FR0134", "nombre": "Caroreña Vera", "presentacion": "RET 222MLX36UN PL"},
            {"codigo": "FR0135", "nombre": "Caroreña Vera", "presentacion": "RET 222MLX36UN SE"},
            {"codigo": "FR0138", "nombre": "Caroreña Vera", "presentacion": "LAT 250MLX12UN PL"},
            {"codigo": "FR0139", "nombre": "Caroreña Vera", "presentacion": "LAT 250MLX12UN ZF"},
            {"codigo": "FR0140", "nombre": "Caroreña Vera", "presentacion": "LAT 250MLX12UN SE"},
            {"codigo": "FR0154", "nombre": "Caroreña Vera Mojito", "presentacion": "LAT 250MLX12UN"}
          ]
        },
        {
          "nombre": "La Manda",
          "productos": [
            {"codigo": "FR0141", "nombre": "La Manda Sangre Tinta", "presentacion": "1,75X6UN"},
            {"codigo": "FR0142", "nombre": "La Manda Sangre Tinta", "presentacion": "1,75X6UN PL"},
            {"codigo": "FR0143", "nombre": "La Manda Sangre Tinta", "presentacion": "1,75X6UN ZF"},
            {"codigo": "FR0144", "nombre": "La Manda Sangre Tinta", "presentacion": "1,75X6UN SE"},
            {"codigo": "FR0145", "nombre": "La Manda Sangre Blanca", "presentacion": "1,75X6UN"},
            {"codigo": "FR0146", "nombre": "La Manda Sangre Blanca", "presentacion": "1,75X6UN PL"},
            {"codigo": "FR0147", "nombre": "La Manda Sangre Blanca", "presentacion": "1,75X6UN ZF"},
            {"codigo": "FR0148", "nombre": "La Manda Sangre Blanca", "presentacion": "1,75X6UN SE"},
            {"codigo": "FR0149", "nombre": "La Manda Sangre Rosada", "presentacion": "1,75X6UN"},
            {"codigo": "FR0150", "nombre": "La Manda Sangre Rosada", "presentacion": "1,75X6UN PL"},
            {"codigo": "FR0151", "nombre": "La Manda Sangre Rosada", "presentacion": "1,75X6UN ZF"},
            {"codigo": "FR0152", "nombre": "La Manda Sangre Rosada", "presentacion": "1,75X6UN SE"}
          ]
        }
      ]
    },
    {
      "nombre": "Vinos",
      "marcas": [
        {
          "nombre": "Bodegas Pomar",
          "productos": [
            {"codigo": "FN0115", "nombre": "Pomar Rosado", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0118", "nombre": "Pomar Rosado", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0119", "nombre": "Pomar Rosado", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0116", "nombre": "Pomar Blanco", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0120", "nombre": "Pomar Blanco", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0121", "nombre": "Pomar Blanco", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0117", "nombre": "Pomar Tinto", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0122", "nombre": "Pomar Tinto", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0123", "nombre": "Pomar Tinto", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0301", "nombre": "Pomar Frizz", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0302", "nombre": "Pomar Frizzante", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0303", "nombre": "Pomar Frizzante", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0304", "nombre": "Pomar Frizzante Rosado", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0305", "nombre": "Pomar Frizzante Rosado", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0307", "nombre": "Pomar Frizzante Rosado", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0503", "nombre": "Pomar Reserva Tinto", "presentacion": "0,75LX12"},
            {"codigo": "FN0025", "nombre": "Pomar Cranza Tinto", "presentacion": "0,75LX12"},
            {"codigo": "FN0026", "nombre": "Pomar Cranza Tinto", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0027", "nombre": "Pomar Cranza Tinto", "presentacion": "0,75LX12 ZF (E)"},
            {"codigo": "FN0601", "nombre": "Pomar Brut", "presentacion": "0,75LX12 (E)"},
            {"codigo": "FN0606", "nombre": "Pomar Brut", "presentacion": "0,75LX12 EE"},
            {"codigo": "FN0610", "nombre": "Pomar Brut Nature", "presentacion": "0,75LX12"},
            {"codigo": "FN0612", "nombre": "Pomar Demi Sec", "presentacion": "0,75LX12"},
            {"codigo": "FN0613", "nombre": "Pomar Demi Sec", "presentacion": "0,75LX12 PL (E)"},
            {"codigo": "FN0615", "nombre": "Pomar Brut Rosé", "presentacion": "0,75LX12 (E)"}
          ]
        }
      ]
    }
  ]
}

window.PRODUCTOS_POLAR = PRODUCTOS_POLAR;
