build-bridge:
	surfboard compile bridge.ride
start-node:
	docker run -d --name waves-private-node -p 6869:6869 wavesplatform/waves-private-node
test-bridge:
	surfboard test bridge.ride-test.js
test:
	surfboard test
