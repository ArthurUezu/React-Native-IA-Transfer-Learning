import React, { Component, useState } from 'react'
import { View, Button, Text, Image } from 'react-native'

export const TestScreen = ({ navigation }) => {
    const [base64data, setBase64data] = useState(undefined)

    let previewBase64 = []

    const appUpdate = async () => {
        fetch('preview.data').then(
            async (data) => {
                let binary = await data.blob()
                
                //read 10 bytes of file header
                let bytes = binary.slice(0, 10)
                blob2base64(bytes).then(async (data) => {
                    const bytes = base642bytes(data)
                    const totalImages = bytes[0]

                    let imageBytesOffset = 0
                    for (let i = 0; i < totalImages; i++) {
                        const imageSize = sumBytes(
                            bytes[i * 3 + 1],
                            bytes[i * 3 + 2],
                            bytes[i * 3 + 3]
                        )

                        const start = 10 + imageBytesOffset
                        const end = 10 + imageSize + imageBytesOffset
                        const imageBlob = binary.slice(start, end)
                        //adding new image to array
                        previewBase64.push(await blob2base64(imageBlob))
                        imageBytesOffset += imageSize

                        console.log(imageSize)
                    }
                    //loading 3d image from binary file
                    setBase64data(previewBase64[2])
                })
            }
        )
    }

    const blob2base64 = (value) => {
        return new Promise((resolve, reject) => {
            const fileReaderInstance = new FileReader()
            fileReaderInstance.readAsDataURL(value)
            fileReaderInstance.onload = () => {
                resolve(fileReaderInstance.result)
            }
        })
    }

    const base642bytes = (value) => {
        const content = atob(
            value.substr('data:application/octet-stream;base64,'.length)
        )

        const buffer = new ArrayBuffer(content.length)
        const view = new Uint8Array(buffer)
        view.set(Array.from(content).map((c) => c.charCodeAt(0)))
        return view
    }

    const sumBytes = (byte1, byte2, byte3) => {
        let bytes = new Uint8Array(3)
        bytes[0] = byte1
        bytes[1] = byte2
        bytes[2] = byte3

        const result =
            ((bytes[0] & 0xff) << 16) |
            ((bytes[1] & 0xff) << 8) |
            (bytes[2] & 0xff)

        return result
    }

    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    const atob = (input = '') => {
        let str = input.replace(/=+$/, '')
        let output = ''

        if (str.length % 4 == 1) {
            throw new Error(
                "'atob' failed: The string to be decoded is not correctly encoded."
            )
        }
        for (
            let bc = 0, bs = 0, buffer, i = 0;
            (buffer = str.charAt(i++));
            ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
                ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
                : 0
        ) {
            buffer = chars.indexOf(buffer)
        }

        return output
    }

    console.log('TestScreen')

    return (
        <View style={{ backgroundColor: '#FFFFFF', flex: 1, paddingTop: 60 }}>
            <Button
                title="Update app"
                color="#000000"
                onPress={appUpdate}
            ></Button>
            <Image
                source={{ uri: base64data }}
                style={{
                    height: 200,
                    width: null,
                    flex: 1,
                    resizeMode: 'contain',
                }}
            />
        </View>
    )
}