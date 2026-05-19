# A Pie

**¿Qué tienes a 15 minutos caminando desde casa?**

*What can you reach within 15 minutes on foot from your home?*

*Vive tu barrio · Live your neighborhood*

---

![App screenshot](docs/screenshot.png)

> 🔗 **Demo en vivo / Live demo:** _próximamente / coming soon_

---

## ¿Qué es?

Una herramienta interactiva que calcula tu **radio de vida caminable** en Tenerife. Introduces una dirección, eliges cuántos minutos estás dispuesto a caminar, y la app dibuja el polígono real de lo que puedes alcanzar a pie — por las calles reales, no en línea recta.

Dentro de ese polígono aparecen todos los recursos cercanos: farmacias, supermercados, restaurantes, panaderías, parques, colegios, médicos, librerías y mucho más.

## What is it?

An interactive tool that calculates your **walkable life radius** in Tenerife. Enter an address, choose how many minutes you're willing to walk, and the app draws the real polygon of what you can reach on foot — through real streets, not straight lines.

Within that polygon it shows all nearby resources: pharmacies, supermarkets, restaurants, bakeries, parks, schools, doctors, bookstores and more.

---

## Por qué existe / Why it exists

El comercio de barrio en Tenerife está desapareciendo. Negocios con décadas de historia cierran por falta de relevo generacional. La gente los valora pero no los visita — en parte porque no sabe lo que tiene a 5 minutos andando.

Esta app es la herramienta personal para el concepto de **Ciudad de 15 Minutos** (Carlos Moreno), adoptado por París, Barcelona y Melbourne: todo lo que necesitas para vivir debe estar a pie desde casa.

---

## Funcionalidades / Features

- Isócrona peatonal real (polígono calculado por calles, no radio lineal)
- Más de 12.000 recursos en base de datos PostGIS
- Filtros por subcategoría (restaurantes, farmacias, parques...)
- Atajos a 27 ciudades de Tenerife organizadas por zona
- Marcadores emoji por tipo de lugar
- Línea animada del origen al punto seleccionado
- Geolocalización GPS con reverse geocoding
- Diseño responsive mobile / desktop
- Ejemplo precargado al abrir (La Laguna)

---

## Stack técnico / Tech stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Leaflet + Vite |
| Backend | Vercel Serverless Functions (Node.js) |
| Base de datos | Supabase + PostGIS |
| Isócronas | OpenRouteService API (foot-walking) |
| Geocodificación | Nominatim (OSM) |
| Datos | OpenStreetMap via Overpass API |
| Ingesta | Python + SQLAlchemy (script semanal) |
| Deploy | Vercel |

---

## Datos / Data

Los datos de recursos (farmacias, comercios, colegios, etc.) provienen de **OpenStreetMap** bajo licencia [ODbL](https://opendatacommons.org/licenses/odbl/). La ingesta se realiza automáticamente con un script Python que consulta la Overpass API.

Data comes from **OpenStreetMap** under [ODbL license](https://opendatacommons.org/licenses/odbl/). Ingestion runs automatically via a Python script querying the Overpass API.

Atribución del mapa / Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) © [CARTO](https://carto.com/attributions)

---

## Ejecutar en local / Run locally

Necesitas el [Vercel CLI](https://vercel.com/docs/cli) para correr las Serverless Functions en local.

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Edita .env con tus claves de Supabase y OpenRouteService

# 3. Arrancar frontend + API en local
vercel dev
```

La app estará disponible en `http://localhost:3000`.

### Ingesta de datos / Data ingestion

```bash
cd ingesta
pip install -r requirements.txt
python run_ingesta.py
```

Carga ~12.000 recursos desde OpenStreetMap a la base de datos PostGIS.

---

## Autor / Author

Desarrollado en Tenerife, Canarias. por  Ibrahim Velasquez. ibravhq@gmail.com 

---

*Datos: © OpenStreetMap contributors (ODbL) · © CARTO · Isócronas: OpenRouteService*
