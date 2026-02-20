'use client';

import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export default function InteractiveTutorial() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenInteractiveTutorial');
        if (!hasSeen) {
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem('hasSeenInteractiveTutorial', 'true');
        }
    };

    const steps: Step[] = [
        {
            target: 'body',
            content: 'Uygulamanın nasıl çalıştığını kısaca tanıyalım.',
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.tour-roof-types',
            content: 'Bu alandan çatı tipini (Düz veya Beşik Çatı) seçebilirsiniz.',
            placement: 'right',
        },
        {
            target: '.tour-plan-view',
            content: 'Plan Görünümü üzerinden çizim yapabilir, binanın konumunu ve 2 boyutlu ayak izini (footprint) ayarlayabilirsiniz.',
            placement: 'right',
        },
        {
            target: '.tour-3d-view',
            content: 'Plan Görünümünde yaptığınız değişikliklerin 3 boyutlu modelini eşzamanlı olarak buradan görüntüleyebilirsiniz.',
            placement: 'left',
        },
        {
            target: '.tour-elevations-panel',
            content: 'Cepheler (Elevations) panelinden duvar ve mahya yüksekliklerini ayarlayabilir, binayı farklı açılardan (Kuzey, Güney, Doğu, Batı) inceleyebilirsiniz.',
            placement: 'left',
        },
        {
            target: 'body',
            content: 'İşte bu kadar! Mevcut binaları seçip kenarlarından boyutlandırabilir, döndürebilir veya Delete tuşuyla silebilirsiniz.',
            placement: 'center',
        }
    ];

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            locale={{
                back: 'Geri',
                close: 'Kapat',
                last: 'Bitir',
                next: 'İleri',
                skip: 'Geç'
            }}
            run={run}
            scrollToFirstStep={false}
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#f5a623',
                    backgroundColor: '#1e1e1e',
                    textColor: '#fff',
                    arrowColor: '#1e1e1e',
                },
                buttonNext: {
                    backgroundColor: '#f5a623',
                    color: '#fff',
                    fontWeight: 600,
                },
                buttonBack: {
                    color: '#ccc',
                },
                buttonSkip: {
                    color: '#888',
                },
                tooltipContainer: {
                    textAlign: 'left'
                }
            }}
        />
    );
}
