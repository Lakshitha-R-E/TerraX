import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CadastralMap from './components/CadastralMap';
import Properties from './pages/Properties';
import ULPINGenerator from './pages/ULPINGenerator';
import VerticalPropertyView from './pages/VerticalPropertyView';
import UndergroundView from './pages/UndergroundView';
import ValidationCenter from './pages/ValidationCenter';
import WhatIfPlanning from './pages/WhatIfPlanning';
import ChangeHistory from './pages/ChangeHistory';
import DataSources from './pages/DataSources';
import RelationshipGraph from './pages/RelationshipGraph';
import PropertyCreation from './pages/PropertyCreation';
import AIMLModules from './pages/AIMLModules';
import DataImport from './pages/DataImport';
import PropertyDossier from './pages/PropertyDossier';
import PropertyDNA from './pages/PropertyDNA';
import EvidenceFusion from './pages/EvidenceFusion';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<CadastralMap />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/dna" element={<PropertyDNA />} />
          <Route path="/evidence" element={<EvidenceFusion />} />
          <Route path="/create-property" element={<PropertyCreation />} />
          <Route path="/ulpin" element={<ULPINGenerator />} />
          <Route path="/vertical" element={<VerticalPropertyView />} />
          <Route path="/underground" element={<UndergroundView />} />
          <Route path="/validation" element={<ValidationCenter />} />
          <Route path="/relationships" element={<RelationshipGraph />} />
          <Route path="/whatif" element={<WhatIfPlanning />} />
          <Route path="/history" element={<ChangeHistory />} />
          <Route path="/datasources" element={<DataSources />} />
          <Route path="/ai-ml" element={<AIMLModules />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/dossier" element={<PropertyDossier />} />
          <Route path="/dossier/:propertyId" element={<PropertyDossier />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

