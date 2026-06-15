import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Trash, Settings, Shield } from 'lucide-react';

export function SettingsPanel() {
  const { config, updateConfig } = useAppStore();
  const [newPersonName, setNewPersonName] = useState('');
  const [newBillName, setNewBillName] = useState('');
  const [newBillIcon, setNewBillIcon] = useState('');

  const addPerson = () => {
      const name = newPersonName.trim();
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (config.people.some(p => p.id === id || p.name.toLowerCase() === name.toLowerCase())) {
          alert("Person already exists!");
          return;
      }
      const newPeople = [...config.people, { id, name, active: true }];
      updateConfig({ ...config, people: newPeople }, `Added person: ${name}`);
      setNewPersonName('');
  }

  const togglePersonActive = (id: string) => {
      const person = config.people.find(p => p.id === id);
      const newPeople = config.people.map(p => p.id === id ? { ...p, active: !p.active } : p);
      updateConfig({ ...config, people: newPeople }, `${person?.active ? 'Deactivated' : 'Activated'} person: ${person?.name}`);
  }

  const removePerson = (id: string) => {
      if(confirm("Remove this person? Historical data will still exist but won't be linked directly in dropdowns.")) {
          const person = config.people.find(p => p.id === id);
          updateConfig({ ...config, people: config.people.filter(p => p.id !== id) }, `Removed person: ${person?.name}`);
      }
  }

  const addBillType = () => {
      const name = newBillName.trim();
      const icon = newBillIcon.trim() || '🧾';
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (config.billTypes.some(b => b.id === id || b.name.toLowerCase() === name.toLowerCase())) {
          alert('Bill type already exists!');
          return;
      }
      updateConfig({ ...config, billTypes: [...config.billTypes, { id, name, icon }]}, `Added bill type: ${name}`);
      setNewBillName('');
      setNewBillIcon('');
  }

  const removeBillType = (id: string) => {
      if(confirm('Remove this bill category?')) {
          const billType = config.billTypes.find(b => b.id === id);
          updateConfig({ ...config, billTypes: config.billTypes.filter(b => b.id !== id) }, `Removed bill type: ${billType?.name}`);
      }
  }

  return (
    <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 backdrop-blur rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" /> Configuration
            </h2>
            
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-2">People</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <input type="text" value={newPersonName} onChange={e=>setNewPersonName(e.target.value)} placeholder="Enter name" className="flex-1 min-w-0 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500" />
                            <button onClick={addPerson} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap">Add</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {config.people.map(person => (
                                <div key={person.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        👤 {person.name}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${person.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {person.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => togglePersonActive(person.id)} className={`text-[10px] font-bold px-2 py-1 rounded ${person.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                            {person.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => removePerson(person.id)} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 bg-rose-50 dark:bg-rose-900/30 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50">
                                            <Trash className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-2">Bill Types</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <div className="flex gap-2 flex-1">
                                <input type="text" value={newBillIcon} onChange={e=>setNewBillIcon(e.target.value)} placeholder="Icon (🏠)" className="w-16 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-center focus:outline-none focus:border-blue-500" />
                                <input type="text" value={newBillName} onChange={e=>setNewBillName(e.target.value)} placeholder="Bill Type Name" className="flex-1 min-w-0 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <button onClick={addBillType} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap">Add</button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {config.billTypes.map(bt => (
                                <div key={bt.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{bt.icon} {bt.name}</span>
                                    <button onClick={() => removeBillType(bt.id)} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 bg-rose-50 dark:bg-rose-900/30 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50">
                                        <Trash className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="text-[10px] text-yellow-700 bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start">
                    <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
                    <p>Changes here update the local configuration. You must commit these changes to GitHub for them to take effect on the public site.</p>
                </div>
            </div>
        </div>
    </div>
  );
}
