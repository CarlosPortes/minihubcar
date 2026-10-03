import { eq } from 'drizzle-orm';
import { db, sqlClient } from './client';
import { automaker, vehicleModel } from './schema';

interface ModelSeed {
  name: string;
  description?: string;
}

interface AutomakerSeed {
  name: string;
  country: string;
  models: ModelSeed[];
}

const automakersSeedData: AutomakerSeed[] = [
  {
    name: 'McLaren',
    country: 'Reino Unido',
    models: [
      { name: 'Senna', description: 'Hipercarro de pista em homenagem a Ayrton Senna' },
      { name: 'P1', description: 'Hipercarro híbrido parte da Holy Trinity' },
      { name: 'F1', description: 'Clássico com motor BMW V12 e posição central de pilotagem' },
      { name: '720S', description: 'Superesportivo V8 Biturbo' },
      { name: '765LT', description: 'Versão Longtail focada em redução de peso e performance' },
      { name: 'Speedtail', description: 'Hyper-GT com 3 lugares e design aerodinâmico alongado' },
      { name: 'Artura', description: 'Superesportivo híbrido plug-in V6' },
      { name: 'MP4/4', description: 'Carro lendário de Fórmula 1 vencedor de 15 de 16 corridas em 1988' },
      { name: '600LT', description: 'Versão esportiva com escapamentos voltados para cima' },
      { name: 'Elva', description: 'Speedster sem para-brisas de produção limitada' },
    ],
  },
  {
    name: 'Porsche',
    country: 'Alemanha',
    models: [
      { name: '911 GT3 RS', description: 'Versão de alta performance aspirada para pistas e rua' },
      { name: '911 GT3', description: 'Esportivo aspirado com câmbio manual ou PDK' },
      { name: '911 Turbo S', description: 'Topo de linha com tração integral e motor Boxer biturbo' },
      { name: 'Carrera GT', description: 'Supercarro V10 aspirado analógico' },
      { name: '918 Spyder', description: 'Hipercarro híbrido V8 com tecnologia de ponta' },
      { name: '959', description: 'Ícone tecnológico dos anos 80 do Grupo B' },
      { name: '718 Cayman GT4 RS', description: 'Cupê esportivo com motor central de 911 GT3' },
      { name: '356 Speedster', description: 'Primeiro modelo clássico da Porsche' },
      { name: '935 Moby Dick', description: 'Lendário carro de corrida de resistência' },
      { name: 'Taycan Turbo S', description: 'Sedã esportivo 100% elétrico' },
    ],
  },
  {
    name: 'Ferrari',
    country: 'Itália',
    models: [
      { name: 'F40', description: 'Último modelo aprovado pessoalmente por Enzo Ferrari' },
      { name: 'F50', description: 'Superesportivo com motor V12 derivado da Fórmula 1' },
      { name: 'Enzo', description: 'Hipercarro batizado em honra ao fundador' },
      { name: 'LaFerrari', description: 'Hipercarro híbrido V12' },
      { name: '250 GTO', description: 'Um dos carros mais valiosos da história automotiva' },
      { name: '488 Pista', description: 'Versão de alto desempenho da 488 GTB' },
      { name: 'SF90 Stradale', description: 'Hipercarro híbrido plug-in de 1000 cv' },
      { name: 'Daytona SP3', description: 'Série Icona com motor V12 central-traseiro' },
      { name: 'Testarossa', description: 'Ícone dos anos 80 com motor 12 cilindros boxer' },
      { name: 'F8 Tributo', description: 'Homenagem ao motor V8 biturbo premiado' },
    ],
  },
  {
    name: 'Lamborghini',
    country: 'Itália',
    models: [
      { name: 'Miura', description: 'Considerado o primeiro supercarro de motor central da história' },
      { name: 'Countach LP5000', description: 'Ícone de design em cunha dos anos 70 e 80' },
      { name: 'Diablo VT', description: 'Sucessor do Countach com tração integral' },
      { name: 'Murciélago LP670-4 SV', description: 'SuperVeloce V12 de última geração' },
      { name: 'Aventador SVJ', description: 'Recordista de Nürburgring com sistema de aerodinâmica ativa ALA' },
      { name: 'Huracán STO', description: 'Super Trofeo Omologata com tração traseira e aero de corrida' },
      { name: 'Sian FKP 37', description: 'Hipercarro híbrido com supercapacitores' },
      { name: 'Veneno', description: 'Edição ultra-limitada comemorativa de 50 anos' },
      { name: 'Revuelto', description: 'Primeiro supercarro V12 híbrido plug-in da marca' },
      { name: 'Urus Performante', description: 'Super SUV esportivo de alto desempenho' },
    ],
  },
  {
    name: 'Nissan',
    country: 'Japão',
    models: [
      { name: 'Skyline GT-R (R34)', description: 'O lendário Godzilla japonês com motor RB26DETT' },
      { name: 'Skyline GT-R (R32)', description: 'O primeiro a receber o apelido Godzilla nas pistas do Grupo A' },
      { name: 'Skyline GT-R (R33)', description: 'Conhecido pela estabilidade em alta velocidade' },
      { name: 'GT-R (R35) Nismo', description: 'Superesportivo com tração ATTESA E-TS e motor VR38DETT' },
      { name: 'Datsun 510', description: 'Clássico compacto muito popular em coleções Hot Wheels' },
      { name: 'Fairlady Z (240Z)', description: 'Esportivo clássico com motor 6 cilindros em linha' },
      { name: 'Silvia (S15) Spec-R', description: 'Ícone da cultura drift com motor SR20DET' },
      { name: 'Nissan Z (RZ34)', description: 'Geração moderna da linha Z com motor V6 Biturbo' },
      { name: '350Z', description: 'Cupê esportivo emblemático dos anos 2000' },
      { name: '180SX / 240SX', description: 'Esportivo com faróis escamoteáveis' },
    ],
  },
  {
    name: 'Toyota',
    country: 'Japão',
    models: [
      { name: 'Supra MK4 (A80)', description: 'Lendário esportivo com o indestrutível motor 2JZ-GTE' },
      { name: 'GR Supra (A90)', description: 'Geração moderna desenvolvida em parceria pela divisão Gazoo Racing' },
      { name: 'AE86 Sprinter Trueno', description: 'Famoso cupê leve de tração traseira imortalizado no Initial D' },
      { name: 'GR Yaris', description: 'Hot hatch homologado para WRC com tração GR-FOUR' },
      { name: 'GR Corolla', description: 'Hatchback de alto desempenho com tração integral e 300 cv' },
      { name: '2000GT', description: 'Primeiro supercarro japonês clássico de 1967' },
      { name: 'Celica GT-Four', description: 'Campeão histórico do Mundial de Rali (WRC)' },
      { name: 'Land Cruiser (FJ40)', description: 'Lendário utilitário 4x4 todo-terreno clássico' },
      { name: 'MR2 (SW20)', description: 'Esportivo de motor central-traseiro e tração traseira' },
    ],
  },
  {
    name: 'Honda',
    country: 'Japão',
    models: [
      { name: 'NSX (NA1)', description: 'Supercarro de motor central desenvolvido com consultoria de Ayrton Senna' },
      { name: 'NSX Type S (NC1)', description: 'Segunda geração com propulsão híbrida e três motores elétricos' },
      { name: 'Civic Type R (EK9)', description: 'Primeiro Civic Type R com motor B16B VTEC de alto giro' },
      { name: 'Civic Type R (FK8)', description: 'Geração turbinada recordista de pistas com visual agressivo' },
      { name: 'Civic Type R (FL5)', description: 'Geração moderna com dinâmica refinada e transmissão manual' },
      { name: 'Integra Type R (DC2)', description: 'Considerado um dos melhores carros de tração dianteira da história' },
      { name: 'S2000 (AP1)', description: 'Roadster com motor F20C aspirado que girava até 9000 RPM' },
      { name: 'CR-X SiR', description: 'Hatch compacto esportivo clássico com motor VTEC' },
      { name: 'Prelude', description: 'Cupê esportivo tecnológico com esterçamento nas quatro rodas' },
    ],
  },
  {
    name: 'Ford',
    country: 'Estados Unidos',
    models: [
      { name: 'Mustang Shelby GT500', description: 'Versão extrema do muscle car com motor V8 Supercharged' },
      { name: 'Mustang Boss 302', description: 'Clássico de 1969 homologado para a série Trans-Am' },
      { name: 'Ford GT (2005)', description: 'Releitura moderna do lendário GT40 com motor V8 5.4 Supercharged' },
      { name: 'Ford GT (2017)', description: 'Supercarro em fibra de carbono com motor EcoBoost V6 biturbo' },
      { name: 'GT40 MKII', description: 'O clássico vencedor das 24 Horas de Le Mans de 1966' },
      { name: 'F-150 Raptor R', description: 'Picape off-road de alto desempenho com motor V8 de Mustang Shelby' },
      { name: 'Escort RS Cosworth', description: 'Ícone das pistas de rali com asa traseira tipo baleia' },
      { name: 'Bronco Badlands', description: 'Utilitário 4x4 voltado para trilhas extremas' },
      { name: 'Sierra RS500 Cosworth', description: 'Dominador das corridas de turismo nos anos 80' },
    ],
  },
  {
    name: 'Chevrolet',
    country: 'Estados Unidos',
    models: [
      { name: 'Corvette Stingray (C8)', description: 'Primeiro Corvette de produção em série com motor central-traseiro' },
      { name: 'Corvette Z06 (C8)', description: 'Equipado com o motor V8 aspirado de virabrequim plano mais potente do mundo' },
      { name: 'Corvette ZR1 (C7)', description: 'O Corvette de motor dianteiro definitivo com 755 cv' },
      { name: 'Corvette Stingray (C3 1969)', description: 'Design clássico inspirado no tubarão Mako Shark' },
      { name: 'Camaro SS (1969)', description: 'Um dos muscle cars mais icônicos de todos os tempos' },
      { name: 'Camaro ZL1', description: 'Versão supercharged de 650 cv com foco em pistas' },
      { name: 'Chevelle SS (1970)', description: 'Muscle car com motor V8 454 Big Block' },
      { name: 'Bel Air (1957)', description: 'Símbolo da era dourada do design automotivo americano' },
      { name: 'Silverado ZR2', description: 'Picape robusta preparada para off-road extremo' },
    ],
  },
  {
    name: 'Dodge',
    country: 'Estados Unidos',
    models: [
      { name: 'Challenger SRT Demon 170', description: 'Monstro de arrancada com mais de 1000 cv abastecido com E85' },
      { name: 'Challenger SRT Hellcat', description: 'Muscle car moderno com motor 6.2 HEMI Supercharged' },
      { name: 'Charger R/T (1970)', description: 'O clássico Charger eternizado na cultura pop e no cinema' },
      { name: 'Viper ACR', description: 'Superesportivo V10 recordista em circuitos pelo mundo com aero massiva' },
      { name: 'Viper GTS (1996)', description: 'Cupê V10 clássico com o teto de bolha dupla' },
      { name: 'Ram 1500 TRX', description: 'Superpicape equipada com o motor Hellcat' },
    ],
  },
  {
    name: 'BMW',
    country: 'Alemanha',
    models: [
      { name: 'M3 (E30)', description: 'O primeiro M3 da história e um dos carros mais vitoriosos do automobilismo' },
      { name: 'M3 (E36) Lightweight', description: 'Versão aliviada para entusiastas de pista' },
      { name: 'M3 CSL (E46)', description: 'Referência em dinâmica com motor S54 aspirado e teto em fibra de carbono' },
      { name: 'M3 GTS (E92)', description: 'Geração equipada com motor V8 de 4.4L voltada para circuitos' },
      { name: 'M4 CSL (G82)', description: 'Cupê extremo de 550 cv com redução substancial de peso' },
      { name: 'M5 (E39)', description: 'Considerado por muitos o melhor sedã esportivo V8 manual já feito' },
      { name: 'M1 (E26)', description: 'O único supercarro de motor central da BMW desenhado por Giugiaro' },
      { name: '2002 Turbo', description: 'O pioneiro europeu com motor turbocomprimido em 1973' },
    ],
  },
  {
    name: 'Mercedes-Benz',
    country: 'Alemanha',
    models: [
      { name: '300 SL Gullwing', description: 'O pioneiro asa-de-gaivota com injeção mecânica direta' },
      { name: '190E 2.5-16 Evolution II', description: 'Lenda do DTM com asa ajustável e motor Cosworth' },
      { name: 'AMG GT Black Series', description: 'Recordista em Nürburgring com motor V8 de virabrequim plano' },
      { name: 'SLS AMG', description: 'Releitura moderna do Gullwing com motor V8 6.2L aspirado' },
      { name: 'CLK GTR', description: 'Monstro de homologação da categoria FIA GT dos anos 90' },
      { name: 'G 63 AMG', description: 'Ícone off-road de luxo com motor V8 biturbo' },
      { name: 'SLR McLaren', description: 'Super GT desenvolvido em parceria com a McLaren' },
    ],
  },
  {
    name: 'Audi',
    country: 'Alemanha',
    models: [
      { name: 'Sport Quattro S1 (E2)', description: 'Monstro do Grupo B de rali com tração integral quattro' },
      { name: 'RS6 Avant', description: 'A perua superesportiva definitiva com motor V8 biturbo e tração quattro' },
      { name: 'R8 V10 Performance', description: 'Supercarro com motor V10 aspirado e tração traseira ou quattro' },
      { name: 'RS2 Avant', description: 'A pioneira desenvolvida em conjunto com a Porsche' },
      { name: 'RS4 Avant (B5)', description: 'Primeira RS4 com motor V6 2.7 biturbo desenvolvido pela Cosworth' },
    ],
  },
  {
    name: 'Volkswagen',
    country: 'Alemanha',
    models: [
      { name: 'Fusca / Beetle (1967)', description: 'O carro mais popular e carismático do planeta' },
      { name: 'Kombi (T1)', description: 'A lendária van clássica conhecida internacionalmente como Type 2' },
      { name: 'Golf GTI MK1', description: 'O criador da categoria hot hatch esportiva em 1976' },
      { name: 'Golf R', description: 'Versão de alta performance com tração 4Motion' },
      { name: 'SP2', description: 'Cupê esportivo exclusivo brasileiro de design aclamado mundialmente' },
    ],
  },
  {
    name: 'Aston Martin',
    country: 'Reino Unido',
    models: [
      { name: 'DB5', description: 'O carro clássico mais famoso de James Bond' },
      { name: 'Valkyrie', description: 'Hipercarro extremo com motor Cosworth V12 aspirado de 11.000 RPM' },
      { name: 'Vantage V12', description: 'Cupê compacto com a força do motor V12 britânico' },
      { name: 'DBS Superleggera', description: 'Super GT com motor V12 biturbo de 725 cv' },
      { name: 'Vulcan', description: 'Hipercarro de pista com motor 7.0L V12 de 820 cv' },
    ],
  },
  {
    name: 'Bugatti',
    country: 'França',
    models: [
      { name: 'Chiron Pur Sport', description: 'Focado em agilidade em curvas e dinâmica lateral com motor W16 quad-turbo' },
      { name: 'Veyron 16.4', description: 'O primeiro carro de produção em série a superar os 400 km/h' },
      { name: 'Bolide', description: 'Monstro de pista de 1850 cv com relação peso/potência inacreditável' },
      { name: 'EB110 Super Sport', description: 'Superesportivo dos anos 90 com motor V12 quad-turbo' },
      { name: 'Type 57 SC Atlantic', description: 'Uma das maiores obras-primas da história do automóvel' },
    ],
  },
  {
    name: 'Koenigsegg',
    country: 'Suécia',
    models: [
      { name: 'Jesko Attack', description: 'Hipercarro com motor V8 biturbo e câmbio LST de 9 marchas' },
      { name: 'Agera RS', description: 'Ex-recordista mundial de velocidade máxima em vias públicas' },
      { name: 'Regera', description: 'Hipercarro híbrido com sistema Koenigsegg Direct Drive sem caixa de marchas' },
      { name: 'One:1', description: 'O primeiro Megacarro do mundo com relação peso/potência de exatamente 1:1' },
      { name: 'Gemera', description: 'Mega-GT de 4 lugares e 2300 cv' },
    ],
  },
  {
    name: 'Pagani',
    country: 'Itália',
    models: [
      { name: 'Zonda R', description: 'Obra de arte de pista com motor Mercedes-AMG V12 aspirado' },
      { name: 'Zonda Cinque', description: 'Edição ultra-rara de apenas 5 unidades no mundo' },
      { name: 'Huayra BC', description: 'Homenagem a Benny Caiola com aerodinâmica ativa e motor AMG V12 biturbo' },
      { name: 'Utopia', description: 'Superesportivo com motor V12 manual e design purista' },
    ],
  },
  {
    name: 'Mazda',
    country: 'Japão',
    models: [
      { name: 'RX-7 (FD3S)', description: 'Ícone japonês com o consagrado motor rotativo Wankel biturbo 13B-REW' },
      { name: 'MX-5 Miata (NA)', description: 'O roadster mais vendido do mundo com faróis escamoteáveis' },
      { name: '787B', description: 'Lendário vencedor das 24 Horas de Le Mans com motor rotativo 4 rotores' },
      { name: 'RX-7 (FC3S)', description: 'Geração dos anos 80 consagrada nas pistas e no drift' },
    ],
  },
  {
    name: 'Subaru',
    country: 'Japão',
    models: [
      { name: 'Impreza 22B STi', description: 'A lenda das lendas do WRC com carroceria cupê alargada e motor 2.2L boxer' },
      { name: 'WRX STi (S209)', description: 'Edição especial afinada pela divisão STI com motor boxer turbo' },
      { name: 'Impreza WRX STi (Blobeye)', description: 'Geração icônica dos anos 2000 no rali internacional' },
      { name: 'BRZ', description: 'Cupê esportivo leve com tração traseira' },
    ],
  },
  {
    name: 'Mitsubishi',
    country: 'Japão',
    models: [
      { name: 'Lancer Evolution VI (Tommi Mäkinen)', description: 'Homenagem ao tetracampeão mundial de rali' },
      { name: 'Lancer Evolution IX MR', description: 'Considerado o ápice da plataforma CT9A com motor 4G63 MIVEC' },
      { name: 'Lancer Evolution X', description: 'Última geração do modelo com motor 4B11T e tração Super All-Wheel Control' },
      { name: 'Eclipse GSX', description: 'Cupê esportivo com tração integral e motor turbo 4G63' },
      { name: '3000GT VR-4', description: 'Monstro tecnológico dos anos 90 com tração e esterçamento nas quatro rodas' },
    ],
  },
];

async function runSeed() {
  console.log('🏁 Iniciando cadastro de Montadoras e Modelos de Carro...');

  // Busca montadoras e modelos atuais no banco
  const existingAutomakers = await db.select().from(automaker);
  const existingModels = await db.select().from(vehicleModel);

  console.log(`Encontradas ${existingAutomakers.length} montadoras e ${existingModels.length} modelos existentes no banco.`);

  let automakersCreated = 0;
  let modelsCreated = 0;

  for (const autoData of automakersSeedData) {
    const normName = autoData.name.toLowerCase().trim();

    // Verifica se montadora já existe (por nome normalizado ou variações comuns como Maclaren / Mclaren)
    let autoRow = existingAutomakers.find(
      (a) =>
        a.normalizedName === normName ||
        (normName === 'mclaren' && a.normalizedName.includes('maclaren'))
    );

    if (!autoRow) {
      const [inserted] = await db
        .insert(automaker)
        .values({
          name: autoData.name,
          normalizedName: normName,
          country: autoData.country,
          status: 'ACTIVE',
        })
        .returning();

      autoRow = inserted;
      if (autoRow) {
        existingAutomakers.push(autoRow);
        automakersCreated++;
        console.log(`  ➕ Montadora criada: ${autoData.name} (${autoData.country})`);
      }
    } else {
      console.log(`  ℹ️ Montadora já cadastrada: ${autoRow.name} (${autoRow.country || 'N/A'})`);
    }

    if (!autoRow) continue;

    // Cadastra os modelos respectivos desta montadora
    for (const modelData of autoData.models) {
      const normModelName = modelData.name.toLowerCase().trim();

      const existingModel = existingModels.find(
        (m) =>
          m.automakerId === autoRow.id &&
          (m.normalizedName === normModelName ||
            m.name.toLowerCase().trim() === normModelName)
      );

      if (!existingModel) {
        const [insertedModel] = await db
          .insert(vehicleModel)
          .values({
            automakerId: autoRow.id,
            name: modelData.name,
            normalizedName: normModelName,
            description: modelData.description || null,
            status: 'ACTIVE',
          })
          .returning();

        if (insertedModel) {
          existingModels.push(insertedModel);
          modelsCreated++;
          console.log(`     🚗 Modelo adicionado: [${autoRow.name}] ${modelData.name}`);
        }
      } else {
        console.log(`     ✔️ Modelo já existente: [${autoRow.name}] ${existingModel.name}`);
      }
    }
  }

  console.log('\n========================================');
  console.log(`🎉 Concluído com sucesso!`);
  console.log(`   - Novas montadoras cadastradas: ${automakersCreated}`);
  console.log(`   - Novos modelos de carro cadastrados: ${modelsCreated}`);
  console.log(`   - Total de montadoras ativas: ${existingAutomakers.length}`);
  console.log(`   - Total de modelos ativos: ${existingModels.length}`);
  console.log('========================================\n');

  await sqlClient.end();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Erro durante o seed de montadoras e modelos:', err);
  process.exit(1);
});
