export const roomData = {
    1: {
        label:'Chillen'
    },
    2: {
        label:'Programmierung'
    },
    3: {
        label:'Musik'
    },
    4: {
        label:'Putzen'
    }
};

export const roomDataArray = () => {
    return Object.keys(roomData).map((key) => ({...roomData[key], value: key}));
};
