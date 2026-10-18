'use client';

import React from 'react';

export interface ExportStudentItem {
  id: string;
  nis: string;
  full_name: string;
  class?: { id?: string; name: string };
  status?: string;
  plain_password?: string | null;
}

interface StudentCredentialsPrintTemplateProps {
  students: ExportStudentItem[];
  templateType: 'tabular' | 'cards';
  schoolName?: string;
}

export function StudentCredentialsPrintTemplate({
  students,
  templateType,
  schoolName = 'SECURE CBT ASSESSMENT SYSTEM',
}: StudentCredentialsPrintTemplateProps) {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media screen {
  #cbt-student-credentials-print-portal {
    display: none !important;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  body.printing-student-credentials {
    background: #ffffff !important;
    color: #000000 !important;
  }

  body.printing-student-credentials > *:not(#cbt-student-credentials-print-portal) {
    display: none !important;
  }

  body.printing-student-credentials #cbt-student-credentials-print-portal {
    display: block !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    visibility: visible !important;
  }

  body.printing-student-credentials #cbt-student-credentials-print-portal * {
    visibility: visible !important;
    color: #000000 !important;
    border-color: #333333 !important;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .cbt-print-card {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .cbt-print-table tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
`,
        }}
      />

      <div
        id="cbt-student-credentials-print-portal"
        className="text-black bg-white p-2 font-sans"
      >
        {templateType === 'tabular' ? (
          <div>
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <h1 className="text-lg font-bold uppercase tracking-wide">{schoolName}</h1>
              <h2 className="text-base font-semibold uppercase">Daftar Akun & Kredensial Peserta CBT</h2>
              <p className="text-xs text-gray-700 mt-1">Dicetak pada: {currentDate} | Total: {students.length} Siswa</p>
            </div>

            {/* Table */}
            <table className="cbt-print-table w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-100 font-semibold text-center">
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5 w-24">NIS</th>
                  <th className="border border-black p-1.5 text-left">Nama Siswa</th>
                  <th className="border border-black p-1.5 w-28 text-left">Kelas</th>
                  <th className="border border-black p-1.5 w-24">Username</th>
                  <th className="border border-black p-1.5 w-28">Password</th>
                  <th className="border border-black p-1.5 w-28">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.id} className="border-b border-black">
                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-mono text-center">{student.nis}</td>
                    <td className="border border-black p-1.5 font-medium">{student.full_name}</td>
                    <td className="border border-black p-1.5">{student.class?.name || '-'}</td>
                    <td className="border border-black p-1.5 font-mono text-center">{student.nis}</td>
                    <td className="border border-black p-1.5 font-mono font-bold text-center">
                      {student.plain_password || student.nis}
                    </td>
                    <td className="border border-black p-1.5 h-9"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {/* Cards Header */}
            <div className="text-center border-b border-gray-400 pb-2 mb-4">
              <h1 className="text-sm font-bold uppercase">{schoolName}</h1>
              <p className="text-xs text-gray-600">KARTU LOGIN PESERTA UJIAN CBT ({students.length} Siswa)</p>
            </div>

            {/* Cut-out Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="cbt-print-card border-2 border-dashed border-gray-600 rounded-md p-3 text-xs flex flex-col justify-between"
                  style={{ minHeight: '165px' }}
                >
                  <div>
                    <div className="flex justify-between items-center border-b border-gray-400 pb-1 mb-2">
                      <span className="font-bold tracking-tight text-[11px] uppercase">KARTU LOGIN CBT</span>
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                        {student.class?.name || 'UMUM'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-20 text-gray-700">Nama Siswa</span>
                        <span className="w-3">:</span>
                        <span className="font-semibold flex-1 truncate">{student.full_name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-20 text-gray-700">NIS</span>
                        <span className="w-3">:</span>
                        <span className="font-mono">{student.nis}</span>
                      </div>
                      <div className="flex">
                        <span className="w-20 text-gray-700">Username</span>
                        <span className="w-3">:</span>
                        <span className="font-mono font-semibold">{student.nis}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-20 text-gray-700">Password</span>
                        <span className="w-3">:</span>
                        <span className="font-mono font-bold text-sm bg-gray-100 px-1.5 py-0.5 border border-gray-300 rounded">
                          {student.plain_password || student.nis}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-dashed border-gray-300 text-[9px] text-gray-500 italic text-center">
                    Simpan kartu ini. Dilarang membagikan password kepada pihak lain.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
